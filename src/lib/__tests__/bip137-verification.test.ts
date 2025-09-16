/**
 * Test BIP-137 signature verification
 * BIP-137 is the standard 65-byte signature format used by many Bitcoin wallets
 */

import { verifyMessageWithMethod } from '../signature';
import { base64 } from '@scure/base';

describe('BIP-137 Signature Verification', () => {
  // Known working BIP-137 signatures
  const testCases = [
    {
      name: 'Native SegWit (bc1q)',
      address: 'bc1qhmfed7sgtc25m4p4md5eyvqnel6pf09wwsvx2r',
      message: 'test',
      signature: 'J7mL14qBvSp5AB3utMXX4GYpcUn/pq5Y701KEoksa5AoFgmDbNMEUHqAJzvZwok6IIH2xmVgvDI46kH/hKrmc+I=',
      shouldVerify: true
    },
    {
      name: 'P2SH-SegWit (3)',
      address: '3PWbibQbLjc3UyghSXULXNYciuF9bGbvex',
      message: 'test',
      signature: 'I3k8wsB/kD5V38isNcGG3a5dNYRO7c564PqGGpCMvIRmAsUvbt9R+UYPQOEw8C2mryCo+xB0pZq1bkLaBvIVpmc=',
      shouldVerify: true
    },
    {
      name: 'Legacy P2PKH (1)',
      address: '149kLPCiTuV4BvCU7k8xZGAHPPwjy6vcZa',
      message: 'test',
      signature: 'H7VCIZUmwlVCSUgiVP/nqReiMAsMXODcNdqVU9cF/RsXdalpY5RW/pIfEwdpPHJQnLwSLwvoVxhhoCiPsy9k44w=',
      shouldVerify: true
    },
    {
      name: 'Wrong message (should fail)',
      address: 'bc1qhmfed7sgtc25m4p4md5eyvqnel6pf09wwsvx2r',
      message: 'wrong',
      signature: 'J7mL14qBvSp5AB3utMXX4GYpcUn/pq5Y701KEoksa5AoFgmDbNMEUHqAJzvZwok6IIH2xmVgvDI46kH/hKrmc+I=',
      shouldVerify: false
    }
  ];

  testCases.forEach((testCase) => {
    it(`should ${testCase.shouldVerify ? 'verify' : 'reject'} ${testCase.name}`, async () => {
      const result = await verifyMessageWithMethod(
        testCase.message,
        testCase.signature,
        testCase.address
      );

      expect(result.valid).toBe(testCase.shouldVerify);

      if (result.valid) {
        // Check that it's identified as BIP-137 or Legacy (both are valid)
        expect(['BIP-137', 'Legacy'].some(m => result.method?.includes(m))).toBe(true);
      }
    });
  });

  it('should properly decode BIP-137 signature components', () => {
    const testSig = 'J7mL14qBvSp5AB3utMXX4GYpcUn/pq5Y701KEoksa5AoFgmDbNMEUHqAJzvZwok6IIH2xmVgvDI46kH/hKrmc+I=';
    const sigBytes = base64.decode(testSig);

    // BIP-137 signature should be exactly 65 bytes
    expect(sigBytes.length).toBe(65);

    // Recovery flag should be in valid range
    const flag = sigBytes[0];
    expect(flag).toBeGreaterThanOrEqual(27);
    expect(flag).toBeLessThanOrEqual(42);

    // Flag 39-42 indicates P2WPKH (Native SegWit)
    expect(flag).toBeGreaterThanOrEqual(39);
    expect(flag).toBeLessThanOrEqual(42);
  });
});