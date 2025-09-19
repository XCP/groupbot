/**
 * BIP-322: Generic Signed Message Format - SPEC COMPLIANT
 * https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki
 *
 * THIS IS THE PURE SPEC IMPLEMENTATION - DO NOT MODIFY FOR COMPATIBILITY
 *
 * Supports all address types including SegWit and Taproot
 * Uses virtual transactions for verification
 */

import { VerificationResult } from '../types';
import { verifyMessageWithMethod } from '../../signature';

/**
 * Verify a BIP-322 signature according to the specification
 *
 * For groupbot: Uses existing signature.ts functions which have full BIP-322 support
 */
export async function verifyBIP322(
  message: string,
  signature: string,
  address: string
): Promise<VerificationResult> {
  try {
    // Use the existing BIP-322 implementation from signature.ts
    const result = await verifyMessageWithMethod(message, signature, address);

    if (result.valid && result.method?.includes('BIP-322')) {
      return {
        valid: true,
        method: result.method,
        details: `Verified using ${result.method}`
      };
    }

    return {
      valid: false,
      details: 'Not a valid BIP-322 signature'
    };
  } catch (error) {
    return {
      valid: false,
      details: `BIP-322 verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}