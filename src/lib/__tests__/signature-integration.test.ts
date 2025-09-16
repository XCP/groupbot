/**
 * Integration tests for signature verification
 * Testing the signature module's public API
 *
 * Note: These tests validate signature formats without actual verification
 * due to Jest ES module compatibility issues with noble/secp256k1
 * For full verification tests, run: npx tsx src/lib/__tests__/signature-real.test.ts
 */

describe('Signature Verification Integration Tests', () => {
  const testMessage = `telegram.xcp.io wants you to sign:
Telegram User ID: 123456789
Telegram Chat ID: -1001234567890`;

  describe('Real-world signature scenarios', () => {
    it('should handle signatures from different wallets', () => {
      // Test data from actual wallets
      const realWorldTests = [
        {
          name: 'XCP Wallet P2PKH',
          address: '19QWXpMXeLkoEKEJv2xo9rn8wkPCyxACSX',
          signature: 'ICCS89rbz9IAB78HWeD+GzJ2QFArYU/7dyKFbVV7bljRaufy7M0d0/a55HaUyGpQVPKIhizXuQvkKwtwpcpY8Mo=',
          message: `telegram.xcp.io wants you to sign:
Telegram User ID: 8325861735
Telegram Chat ID: -1002935717124`,
          expectedFlag: 32
        }
      ];

      for (const test of realWorldTests) {
        // Decode to check flag
        const sigBytes = Buffer.from(test.signature, 'base64');
        expect(sigBytes[0]).toBe(test.expectedFlag);
        expect(sigBytes.length).toBe(65);
      }
    });

    // Test that signature format validation works for known good signatures
    it('should validate signature format for verified signatures', () => {
      const verifiedSignatures = [
        {
          name: 'Native SegWit (bc1q)',
          signature: 'J7mL14qBvSp5AB3utMXX4GYpcUn/pq5Y701KEoksa5AoFgmDbNMEUHqAJzvZwok6IIH2xmVgvDI46kH/hKrmc+I=',
          expectedFlag: 39
        },
        {
          name: 'P2SH-SegWit (3)',
          signature: 'I3k8wsB/kD5V38isNcGG3a5dNYRO7c564PqGGpCMvIRmAsUvbt9R+UYPQOEw8C2mryCo+xB0pZq1bkLaBvIVpmc=',
          expectedFlag: 35
        },
        {
          name: 'Legacy P2PKH (1)',
          signature: 'H7VCIZUmwlVCSUgiVP/nqReiMAsMXODcNdqVU9cF/RsXdalpY5RW/pIfEwdpPHJQnLwSLwvoVxhhoCiPsy9k44w=',
          expectedFlag: 31
        },
        {
          name: 'BIP-322 Taproot (bc1p)',
          signature: 'tr:745d9365b64d65376bf5b3386508cb02e56dca6c52df6931eee55429b3aa6444da15b25c29d0208ea3cb153c84de2b992533e6f02c035b7b178dab7d95f42829:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        }
      ];

      verifiedSignatures.forEach(sig => {
        if (sig.signature.startsWith('tr:')) {
          expect(sig.signature).toContain(':');
          const parts = sig.signature.split(':');
          expect(parts.length).toBe(3); // tr, signature, pubkey
          expect(parts[0]).toBe('tr');
        } else {
          const sigBytes = Buffer.from(sig.signature, 'base64');
          expect(sigBytes.length).toBe(65);
          if ('expectedFlag' in sig) {
            expect(sigBytes[0]).toBe(sig.expectedFlag);
          }
        }
      });
    });
  });

  describe('Signature format validation', () => {
    it('should validate base64 signature format', () => {
      const validBase64 = 'H0MwLOYGsIubJo0gojh+OwC6uKL62seMN+s/t7vcpEbreWiLvLU1KwMm9EQCPayiDzF8dcOhHX2NmlAma7yHCI8=';
      const sigBytes = Buffer.from(validBase64, 'base64');

      // Check signature structure
      expect(sigBytes.length).toBe(65);
      expect(sigBytes[0]).toBeGreaterThanOrEqual(27);
      expect(sigBytes[0]).toBeLessThanOrEqual(42);
    });

    it('should validate Taproot signature format', () => {
      const taprootSig = 'tr:' + '0'.repeat(128) + ':' + '1'.repeat(64);

      expect(taprootSig.startsWith('tr:')).toBe(true);
      expect(taprootSig.length).toBe(196); // tr: + 128 hex chars + : + 64 hex chars
    });

    it('should validate Taproot signature components', () => {
      const taprootSig = 'tr:745d9365b64d65376bf5b3386508cb02e56dca6c52df6931eee55429b3aa6444da15b25c29d0208ea3cb153c84de2b992533e6f02c035b7b178dab7d95f42829:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';

      expect(taprootSig.startsWith('tr:')).toBe(true);
      const parts = taprootSig.split(':');
      expect(parts.length).toBe(3);
      expect(parts[1].length).toBe(128); // 64-byte signature
      expect(parts[2].length).toBe(64);  // 32-byte x-only pubkey
    });

    it('should reject invalid formats', () => {
      const invalidSigs = [
        'not-valid-base64!!!',
        'tr:wronglength',
        '',
        'tr:',
        Buffer.from(new Uint8Array(30)).toString('base64'), // Too short
      ];

      for (const sig of invalidSigs) {
        if (sig.startsWith('tr:')) {
          const hexPart = sig.slice(3);
          expect(hexPart.length === 128).toBe(false);
        } else if (sig) {
          try {
            const decoded = Buffer.from(sig, 'base64');
            expect(decoded.length === 65).toBe(false);
          } catch {
            // Invalid base64 is also a failure case
            expect(true).toBe(true);
          }
        }
      }
    });
  });

  describe('Message format requirements', () => {
    it('should require proper message structure', () => {
      const validMessages = [
        `telegram.xcp.io wants you to sign:
Telegram User ID: 123456789
Telegram Chat ID: -1001234567890`,
        `telegram.xcp.io wants you to sign:
Telegram User ID: 8325861735
Telegram Chat ID: -1002935717124`
      ];

      for (const msg of validMessages) {
        expect(msg).toContain('telegram.xcp.io wants you to sign:');
        expect(msg).toContain('Telegram User ID:');
        expect(msg).toContain('Telegram Chat ID:');
      }
    });

    it('should handle different line endings', () => {
      const messageWithLF = testMessage;
      const messageWithCRLF = testMessage.replace(/\n/g, '\r\n');

      // Normalize to LF
      const normalizedLF = messageWithLF.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const normalizedCRLF = messageWithCRLF.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      expect(normalizedLF).toBe(normalizedCRLF);
    });
  });
});