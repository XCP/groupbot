import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context as BaseContext } from 'grammy';
import { db } from '@/src/db/prisma';
import { getTelegramMessage } from '@/src/lib/messageUtils';
import { verifyMessage } from '@/src/lib/verifier';
import { passesTokenPolicy, getPolicyForChat } from '@/src/lib/policy';
import { approveJoin, declineJoin } from '@/src/lib/telegram';
import { generatePolicyHash } from '@/src/lib/policyHash';
import { log } from '@/src/lib/logger';

export type MyContext = BaseContext & ConversationFlavor;
export type MyConversation = Conversation<MyContext>;

interface VerificationSession {
  chatId: string;
  groupName: string;
  policyId?: string;
}

export async function verifyConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  const userId = String(ctx.from!.id);

  // Check for pending join requests
  const pendingRequests = await db.joinRequest.findMany({
    where: {
      tgId: userId,
      status: 'pending',
      expiresAt: { gt: new Date() }
    },
    include: {
      group: true
    }
  });

  if (pendingRequests.length === 0) {
    await ctx.reply(
      "❌ You don't have any pending group verification requests.\n\n" +
      "Request to join a group first, then use /verify to complete verification."
    );
    return;
  }

  let selectedRequest: VerificationSession;

  if (pendingRequests.length === 1) {
    // Single request - proceed directly
    const request = pendingRequests[0];
    selectedRequest = {
      chatId: request.chatId,
      groupName: request.group.chatName || `Group ${request.chatId}`,
      policyId: undefined
    };

    await ctx.reply(
      `🔐 **Starting verification for ${selectedRequest.groupName}**\n\n` +
      `I'll guide you through the verification process step by step.`,
      { parse_mode: 'Markdown' }
    );
  } else {
    // Multiple requests - let user choose
    const groupList = pendingRequests.map((req, i) =>
      `${i + 1}. ${req.group.chatName || `Group ${req.chatId}`}`
    ).join('\n');

    await ctx.reply(
      "📋 **You have pending requests for multiple groups:**\n\n" +
      groupList +
      "\n\nPlease reply with the number of the group you want to verify for (1, 2, 3, etc.)",
      { parse_mode: 'Markdown' }
    );

    // Wait for user selection
    const response = await conversation.wait();

    if (!response.message?.text) {
      await ctx.reply("❌ Invalid response. Please start over with /verify");
      return;
    }

    const selection = parseInt(response.message.text);
    if (isNaN(selection) || selection < 1 || selection > pendingRequests.length) {
      await ctx.reply("❌ Invalid selection. Please start over with /verify");
      return;
    }

    const request = pendingRequests[selection - 1];
    selectedRequest = {
      chatId: request.chatId,
      groupName: request.group.chatName || `Group ${request.chatId}`,
      policyId: undefined
    };

    await ctx.reply(
      `✅ Selected: **${selectedRequest.groupName}**\n\n` +
      `Let's continue with the verification process.`,
      { parse_mode: 'Markdown' }
    );
  }

  // Get policy for the selected group
  const policy = await getPolicyForChat(selectedRequest.chatId);
  if (policy?.id) {
    selectedRequest.policyId = policy.id;
  }

  // Step 1: Ask for Bitcoin address
  await ctx.reply(
    "📝 **Step 1: Bitcoin Address**\n\n" +
    "Please send me your Bitcoin/Counterparty address (e.g., bc1q... or 1...):",
    { parse_mode: 'Markdown' }
  );

  const addressResponse = await conversation.wait();

  if (!addressResponse.message?.text) {
    await ctx.reply("❌ Invalid response. Please start over with /verify");
    return;
  }

  const address = addressResponse.message.text.trim();

  // Basic address validation
  if (!address.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$/)) {
    await ctx.reply(
      "❌ That doesn't look like a valid Bitcoin address.\n\n" +
      "Please start over with /verify and provide a valid address."
    );
    return;
  }

  // Check if address meets policy requirements
  if (policy && policy.type === 'token') {
    await ctx.reply(
      `🔍 Checking balance for **${policy.asset}**...\n` +
      `Required: ${policy.minAmount} ${policy.asset}`,
      { parse_mode: 'Markdown' }
    );

    const passes = await passesTokenPolicy(address, {
      asset: policy.asset!,
      min_amount: policy.minAmount!,
      include_unconfirmed: policy.includeUnconfirmed
    });

    if (!passes) {
      await ctx.reply(
        `❌ **Insufficient Balance**\n\n` +
        `Your address doesn't have the required ${policy.minAmount} ${policy.asset}.\n\n` +
        `Please ensure you have the required balance and try again.`,
        { parse_mode: 'Markdown' }
      );

      // Decline the join request
      try {
        await declineJoin(selectedRequest.chatId, userId);
        await db.joinRequest.update({
          where: {
            chatId_tgId: {
              chatId: selectedRequest.chatId,
              tgId: userId
            }
          },
          data: {
            status: 'declined',
            processedAt: new Date()
          }
        });
      } catch (error) {
        console.error('Error declining join:', error);
      }

      return;
    }
  }

  // Step 2: Generate message to sign
  const messageToSign = getTelegramMessage(userId, selectedRequest.chatId);

  await ctx.reply(
    "✅ **Step 2: Sign Message**\n\n" +
    "Please sign this message with your wallet:\n\n" +
    `\`\`\`\n${messageToSign}\n\`\`\`\n\n` +
    "Use your wallet software to sign this exact message, then send me the signature.",
    { parse_mode: 'Markdown' }
  );

  // Step 3: Wait for signature
  const signatureResponse = await conversation.wait();

  if (!signatureResponse.message?.text) {
    await ctx.reply("❌ Invalid response. Please start over with /verify");
    return;
  }

  const signature = signatureResponse.message.text.trim();

  // Step 4: Verify signature
  await ctx.reply("🔐 Verifying signature...");

  try {
    const verificationResult = await verifyMessage(
      messageToSign,
      signature,
      address,
      { strict: false }
    );

    if (!verificationResult.valid) {
      await ctx.reply(
        "❌ **Signature verification failed**\n\n" +
        "The signature doesn't match the address and message.\n" +
        "Please make sure you:\n" +
        "1. Signed the exact message shown\n" +
        "2. Used the correct address\n" +
        "3. Copied the full signature\n\n" +
        "Start over with /verify to try again.",
        { parse_mode: 'Markdown' }
      );

      await log(selectedRequest.chatId, 'error', 'verification_failed', userId, {
        reason: 'invalid_signature',
        method: 'telegram_inline'
      });

      return;
    }

    // Success! Approve the join request
    await approveJoin(selectedRequest.chatId, userId);

    // Update database
    const policyHash = generatePolicyHash(policy);

    await db.$transaction([
      // Update join request
      db.joinRequest.update({
        where: {
          chatId_tgId: {
            chatId: selectedRequest.chatId,
            tgId: userId
          }
        },
        data: {
          status: 'approved',
          processedAt: new Date()
        }
      }),

      // Create/update member record
      db.member.upsert({
        where: {
          chatId_tgId: {
            chatId: selectedRequest.chatId,
            tgId: userId
          }
        },
        update: {
          address,
          state: 'verified',
          lastCheck: new Date(),
          policyHash,
          tgUsername: ctx.from?.username || null,
          tgName: ctx.from?.first_name || null
        },
        create: {
          chatId: selectedRequest.chatId,
          tgId: userId,
          address,
          state: 'verified',
          lastCheck: new Date(),
          policyHash,
          tgUsername: ctx.from?.username || null,
          tgName: ctx.from?.first_name || null
        }
      })
    ]);

    await ctx.reply(
      `✅ **Verification Successful!**\n\n` +
      `You've been approved to join **${selectedRequest.groupName}**!\n\n` +
      `Your address \`${address}\` has been verified.`,
      { parse_mode: 'Markdown' }
    );

    await log(selectedRequest.chatId, 'info', 'approved', userId, {
      address,
      method: 'telegram_inline',
      verification_method: verificationResult.method
    });

  } catch (error) {
    console.error('Verification error:', error);
    await ctx.reply(
      "❌ An error occurred during verification.\n" +
      "Please try again later or use the web verification."
    );

    await log(selectedRequest.chatId, 'error', 'verification_error', userId, {
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'telegram_inline'
    });
  }
}