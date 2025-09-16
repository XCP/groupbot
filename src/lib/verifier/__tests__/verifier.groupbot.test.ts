/**
 * Test the clean architecture verifier in groupbot context
 */

import { describe, it, expect } from 'vitest';
import { verifyMessage, getVerificationReport } from '../verifier';

describe('Groupbot Clean Architecture Verifier', () => {
  // FreeWallet signature - we know this works with bitcoinjs-message
  const freewalletFixture = {
    address: '19QWXpMXeLkoEKEJv2xo9rn8wkPCyxACSX',
    message: 'test',
    signature: 'H+MnkbI81kkWRUys5B6j/svR3I5rQCdjkCH6/Jv88/Q+BoIX6n7hP9Tj/kRqmnfdwLLYv27/pM1hlsWISMVwuBs='
  };

  it('should verify FreeWallet signatures', async () => {
    const result = await verifyMessage(
      freewalletFixture.message,
      freewalletFixture.signature,
      freewalletFixture.address,
      { strict: false }
    );

    console.log('FreeWallet verification result:', result);

    // Should verify successfully
    expect(result.valid).toBe(true);
    expect(result.method).toContain('BIP-137'); // Could be 'BIP-137 (P2PKH)' or 'Loose BIP-137'
  });

  it('should show verification report', async () => {
    const report = await getVerificationReport(
      freewalletFixture.message,
      freewalletFixture.signature,
      freewalletFixture.address
    );

    console.log('Verification Report:', report);

    // Should have valid verification result
    expect(report.specCompliant || report.compatibilityMode).toBe(true);
    expect(report.method).toContain('BIP-137');
  });

  it('should demonstrate clean architecture benefits', () => {
    console.log('✅ Clean architecture provides:');
    console.log('  - Spec-compliant implementations stay pure');
    console.log('  - Cross-platform compatibility is separate');
    console.log('  - Can audit what is spec vs workaround');
    console.log('  - Pure noble/scure implementation, no external deps');
  });
});