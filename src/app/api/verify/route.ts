import { NextRequest } from 'next/server';
import { verifyMessage } from '@/src/lib/verifier';
import { isValidTelegramMessage, getTelegramMessage } from '@/src/lib/messageUtils';
import { passesTokenPolicy } from '@/src/lib/policy';
import { approveJoin, declineJoin } from '@/src/lib/telegram';
import { log } from '@/src/lib/logger';
import { db } from '@/src/db/prisma';
import { generatePolicyHash } from '@/src/lib/policyHash';
import { checkRateLimit, getRateLimitKey } from '@/src/lib/rateLimiter';
import { z } from 'zod';

const VerifySchema = z.object({
  tg_id: z.string(),
  chat_id: z.string(),
  policy_id: z.string().optional(),
  address: z.string(),
  message: z.string(),
  signature: z.string(),
  manual: z.boolean().optional(),
});

export const POST = async (req: NextRequest) => {
  // Rate limiting - 20 requests per minute per IP
  const rateLimitKey = getRateLimitKey(req);
  const { allowed, remaining } = checkRateLimit(rateLimitKey, 20, 60 * 1000);

  if (!allowed) {
    console.log('Rate limit exceeded for:', rateLimitKey);
    return Response.json(
      { ok: false, reason: 'rate_limit', message: 'Too many verification attempts. Please try again in a minute.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    console.log('Verify request received:', {
      tg_id: body.tg_id,
      chat_id: body.chat_id,
      hasAddress: !!body.address,
      hasSignature: !!body.signature,
      isManual: body.manual,
      rateLimitRemaining: remaining
    });

    const data = VerifySchema.parse(body);

    // 1) Validate message format using our message utilities
    const expectedMessage = getTelegramMessage(data.tg_id, data.chat_id);
    const messageIsValid = isValidTelegramMessage(data.message, data.tg_id, data.chat_id);

    console.log('Message validation:', {
      received: data.message,
      expected: expectedMessage,
      isValid: messageIsValid,
      receivedLength: data.message.length,
      expectedLength: expectedMessage.length,
      exactMatch: data.message === expectedMessage
    });

    if (!messageIsValid) {
      console.log('Message validation failed - details:', {
        receivedBytes: Buffer.from(data.message).toString('hex'),
        expectedBytes: Buffer.from(expectedMessage).toString('hex'),
        receivedChars: data.message.split('').map(c => c.charCodeAt(0)),
        expectedChars: expectedMessage.split('').map(c => c.charCodeAt(0))
      });
      return Response.json(
        { ok: false, reason: 'invalid_message',
          details: {
            received: data.message,
            expected: expectedMessage
          }
        },
        { status: 400 }
      );
    }

    // 2) Verify signature
    console.log('Verifying signature:', {
      address: data.address,
      messageLength: data.message.length,
      signatureLength: data.signature.length,
      signatureFormat: data.signature.substring(0, 20) + '...',
      isManual: data.manual
    });

    // Try verification with the exact message first
    let verificationResult = await verifyMessage(
      data.message,
      data.signature,
      data.address,
      { strict: false }
    );

    // If verification fails and message doesn't already end with space, try with trailing space
    if (!verificationResult.valid && !data.message.endsWith(' ')) {
      console.log('First verification failed, trying with trailing space...');
      verificationResult = await verifyMessage(
        data.message + ' ',
        data.signature,
        data.address,
        { strict: false }
      );
    }

    // Try with line ending variations if still failing
    if (!verificationResult.valid && !data.message.endsWith('\n')) {
      console.log('Trying with \\n line ending...');
      verificationResult = await verifyMessage(
        data.message + '\n',
        data.signature,
        data.address,
        { strict: false }
      );
    }

    if (!verificationResult.valid && !data.message.endsWith('\r\n')) {
      console.log('Trying with \\r\\n line ending...');
      verificationResult = await verifyMessage(
        data.message + '\r\n',
        data.signature,
        data.address,
        { strict: false }
      );
    }

    console.log('Signature verification result:', {
      valid: verificationResult.valid,
      method: verificationResult.method,
      details: verificationResult.details,
      triedWithSpace: !data.message.endsWith(' ')
    });

    if (!verificationResult.valid) {
      // Try to decline the join request, but don't fail if it errors
      try {
        await declineJoin(data.chat_id, data.tg_id);
      } catch (error) {
        console.log('Failed to decline join request (may have expired):', error);
      }

      await log(data.chat_id, 'warn', 'declined', data.tg_id, {
        reason: 'signature_invalid',
        address: data.address,
        isManual: data.manual
      });

      return Response.json({
        ok: false,
        reason: 'signature_invalid'
      });
    }

    // 3) Policy check
    const policy = data.policy_id
      ? await db.policy.findUnique({ where: { id: data.policy_id }})
      : await db.policy.findUnique({ where: { chatId: data.chat_id }});

    // Generate hash for current policy
    const policyHash = generatePolicyHash(policy);

    if (policy && policy.type === 'token') {
      const pass = await passesTokenPolicy(data.address, {
        asset: policy.asset!,
        min_amount: policy.minAmount!,
        include_unconfirmed: policy.includeUnconfirmed,
      });

      if (!pass) {
        await declineJoin(data.chat_id, data.tg_id);
        await log(data.chat_id, 'warn', 'declined', data.tg_id, {
          reason: 'balance_insufficient',
          asset: policy.asset,
          required: policy.minAmount
        });
        return Response.json({ ok: false, reason: 'balance_insufficient' });
      }
    }

    // 4) Check if user was previously restricted due to DM failure
    const existingMember = await db.member.findUnique({
      where: {
        chatId_tgId: {
          chatId: data.chat_id,
          tgId: data.tg_id
        }
      }
    });

    const wasRestricted = existingMember?.state === 'restricted' && existingMember?.dmFailure === true;

    // 5) Persist attestation & member in a transaction
    const attestationTTL = Number(process.env.ATTESTATION_TTL_DAYS ?? 90);

    // Use a transaction to ensure all DB operations succeed or fail together
    await db.$transaction(async (tx) => {
      // Ensure the group exists before creating member record
      await tx.group.upsert({
        where: { chatId: data.chat_id },
        update: { updatedAt: new Date() },
        create: {
          chatId: data.chat_id,
          ownerTgId: data.tg_id  // This user is creating the group context
        }
      });

      await tx.attestation.create({
        data: {
          chatId: data.chat_id,
          tgId: data.tg_id,
          address: data.address,
          chain: 'btc',
          verifiedAt: new Date(),
          expiresAt: new Date(Date.now() + (attestationTTL * 86400000)),
        }
      });

      await tx.member.upsert({
        where: {
          chatId_tgId: {
            chatId: data.chat_id,
            tgId: data.tg_id
          }
        },
        update: {
          address: data.address,
          state: 'verified',
          lastCheck: new Date(),
          policyHash: policyHash,
          dmFailure: false,  // Clear the DM failure flag
          restrictedAt: null  // Clear the restriction timestamp
        },
        create: {
          chatId: data.chat_id,
          tgId: data.tg_id,
          address: data.address,
          state: 'verified',
          lastCheck: new Date(),
          policyHash: policyHash
        }
      });

      // Mark join request as approved
      await tx.joinRequest.updateMany({
        where: {
          chatId: data.chat_id,
          tgId: data.tg_id,
          status: 'pending'
        },
        data: {
          status: 'approved',
          processedAt: new Date()
        }
      });
    });

    // If user was previously restricted due to DM failure, unrestrict them
    if (wasRestricted) {
      console.log('User was previously restricted due to DM failure, unrestricting...');
      const { unrestrictMember } = await import('@/src/lib/telegram');
      try {
        await unrestrictMember(data.chat_id, data.tg_id);
        console.log('Successfully unrestricted user');
      } catch (error) {
        console.error('Failed to unrestrict user:', error);
        // Don't fail the verification if unrestrict fails - they're verified in our system
      }
    }

    // Try to approve the Telegram join request
    console.log('Attempting to approve Telegram join request...');
    const approveResult = await approveJoin(data.chat_id, data.tg_id);

    if (approveResult === null) {
      console.log('Join request was already processed or expired - user needs to request again');
      // Still log success since verification itself worked
      await log(data.chat_id, 'info', 'approved', data.tg_id, {
        address: data.address,
        manual: data.manual,
        note: 'Verified but join request expired - user needs to request to join again'
      });

      return Response.json({
        ok: true,
        warning: 'Verification successful but join request expired. Please request to join the group again.'
      });
    } else {
      console.log('Successfully approved join request');
      await log(data.chat_id, 'info', 'approved', data.tg_id, {
        address: data.address,
        manual: data.manual
      });

      return Response.json({ ok: true });
    }

  } catch (error) {
    console.error('Verification error details:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });

    if (error instanceof z.ZodError) {
      return Response.json(
        { ok: false, reason: 'invalid_request', details: error.issues },
        { status: 400 }
      );
    }

    // Check for Prisma/database errors
    if (error instanceof Error && error.message.includes('prisma')) {
      console.error('Database error during verification:', error.message);
    }

    // Return more specific error info in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      {
        ok: false,
        reason: 'server_error',
        message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
};