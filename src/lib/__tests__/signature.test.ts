// Add TextEncoder/TextDecoder to test environment
// eslint-disable-next-line @typescript-eslint/no-require-imports
global.TextEncoder = require('util').TextEncoder;
// eslint-disable-next-line @typescript-eslint/no-require-imports
global.TextDecoder = require('util').TextDecoder;

import { verifySignatureBip322, parseSignature } from '../signature';

describe('Signature Verification', () => {
  describe('Real signature verification tests', () => {
    // These are actual working signatures that should verify correctly
    const realTestCases = [
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
        name: 'BIP-322 Taproot (bc1p) - Generated with known private key',
        address: 'bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9',
        message: 'Hello World',
        signature: 'tr:745d9365b64d65376bf5b3386508cb02e56dca6c52df6931eee55429b3aa6444da15b25c29d0208ea3cb153c84de2b992533e6f02c035b7b178dab7d95f42829:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        shouldVerify: true
      }
    ];

    realTestCases.forEach(testCase => {
      it(`should verify ${testCase.name}`, async () => {
        const result = await verifySignatureBip322(
          testCase.address,
          testCase.message,
          testCase.signature
        );
        expect(result).toBe(testCase.shouldVerify);
      });
    });

    it('should reject signature with wrong message', async () => {
      const result = await verifySignatureBip322(
        'bc1qhmfed7sgtc25m4p4md5eyvqnel6pf09wwsvx2r',
        'wrong message', // Wrong message
        'J7mL14qBvSp5AB3utMXX4GYpcUn/pq5Y701KEoksa5AoFgmDbNMEUHqAJzvZwok6IIH2xmVgvDI46kH/hKrmc+I='
      );
      expect(result).toBe(false);
    });

    it('should reject signature with wrong address', async () => {
      const result = await verifySignatureBip322(
        'bc1qwrongaddress123456789', // Wrong address
        'test',
        'J7mL14qBvSp5AB3utMXX4GYpcUn/pq5Y701KEoksa5AoFgmDbNMEUHqAJzvZwok6IIH2xmVgvDI46kH/hKrmc+I='
      );
      expect(result).toBe(false);
    });

    it('should reject BIP-322 Taproot signature with wrong message', async () => {
      const result = await verifySignatureBip322(
        'bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9',
        'Wrong Message',
        'tr:745d9365b64d65376bf5b3386508cb02e56dca6c52df6931eee55429b3aa6444da15b25c29d0208ea3cb153c84de2b992533e6f02c035b7b178dab7d95f42829:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
      );
      expect(result).toBe(false);
    });

    it('should reject BIP-322 Taproot signature with wrong address', async () => {
      const result = await verifySignatureBip322(
        'bc1qhrdnmkzlphuq6tvntcvdvjp7vwlfvr8lkxf5xn', // Wrong address (not even Taproot)
        'Hello World',
        'tr:745d9365b64d65376bf5b3386508cb02e56dca6c52df6931eee55429b3aa6444da15b25c29d0208ea3cb153c84de2b992533e6f02c035b7b178dab7d95f42829:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
      );
      expect(result).toBe(false);
    });
  });

  describe('parseSignature', () => {
    it('should parse valid Taproot BIP-322 signature', () => {
      const signature = 'tr:' + '0'.repeat(128) + ':' + '1'.repeat(64);
      const parsed = parseSignature(signature);

      expect(parsed.valid).toBe(true);
      expect(parsed.type).toBe('BIP-322 Simple (Taproot)');
      expect(parsed.r).toBe('0'.repeat(64));
      expect(parsed.s).toBe('0'.repeat(64));
    });

    it('should parse valid base64 P2PKH signature', () => {
      const signature = 'H7VCIZUmwlVCSUgiVP/nqReiMAsMXODcNdqVU9cF/RsXdalpY5RW/pIfEwdpPHJQnLwSLwvoVxhhoCiPsy9k44w=';
      const parsed = parseSignature(signature);

      expect(parsed.valid).toBe(true);
      expect(parsed.type).toBe('P2PKH (compressed)');
      expect(parsed.flag).toBe(31);
      expect(parsed.r).toBeDefined();
      expect(parsed.s).toBeDefined();
    });

    it('should parse valid base64 P2WPKH signature', () => {
      const signature = 'J7mL14qBvSp5AB3utMXX4GYpcUn/pq5Y701KEoksa5AoFgmDbNMEUHqAJzvZwok6IIH2xmVgvDI46kH/hKrmc+I=';
      const parsed = parseSignature(signature);

      expect(parsed.valid).toBe(true);
      expect(parsed.type).toBe('P2WPKH');
      expect(parsed.flag).toBe(39);
      expect(parsed.r).toBeDefined();
      expect(parsed.s).toBeDefined();
    });

    it('should parse valid base64 P2SH-P2WPKH signature', () => {
      const signature = 'I3k8wsB/kD5V38isNcGG3a5dNYRO7c564PqGGpCMvIRmAsUvbt9R+UYPQOEw8C2mryCo+xB0pZq1bkLaBvIVpmc=';
      const parsed = parseSignature(signature);

      expect(parsed.valid).toBe(true);
      expect(parsed.type).toBe('P2SH-P2WPKH');
      expect(parsed.flag).toBe(35);
      expect(parsed.r).toBeDefined();
      expect(parsed.s).toBeDefined();
    });

    it('should handle invalid Taproot signature format', () => {
      const signature = 'tr:invalid';
      const parsed = parseSignature(signature);

      expect(parsed.valid).toBe(false);
    });

    it('should handle malformed base64', () => {
      const signature = 'not-valid-base64!!!';
      const parsed = parseSignature(signature);

      expect(parsed.valid).toBe(false);
    });

    it('should handle Taproot signature with odd length (missing leading zero)', () => {
      const signature = 'tr:' + '1'.repeat(127) + ':' + '2'.repeat(64);
      const parsed = parseSignature(signature);

      expect(parsed.valid).toBe(true);
      expect(parsed.type).toBe('BIP-322 Simple (Taproot)');
      // Should add leading zero
      expect(parsed.r).toBe('0' + '1'.repeat(63));
    });
  });

  describe('Format validation', () => {
    it('should reject Taproot signature without tr: prefix', async () => {
      const result = await verifySignatureBip322(
        'bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9',
        'Hello World',
        '745d9365b64d65376bf5b3386508cb02e56dca6c52df6931eee55429b3aa6444da15b25c29d0208ea3cb153c84de2b992533e6f02c035b7b178dab7d95f42829:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
      );
      expect(result).toBe(false);
    });

    it('should reject Taproot signature without pubkey', async () => {
      const result = await verifySignatureBip322(
        'bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9',
        'Hello World',
        'tr:745d9365b64d65376bf5b3386508cb02e56dca6c52df6931eee55429b3aa6444da15b25c29d0208ea3cb153c84de2b992533e6f02c035b7b178dab7d95f42829'
      );
      expect(result).toBe(false);
    });

    it('should reject Taproot signature with invalid pubkey length', async () => {
      const result = await verifySignatureBip322(
        'bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9',
        'Hello World',
        'tr:745d9365b64d65376bf5b3386508cb02e56dca6c52df6931eee55429b3aa6444da15b25c29d0208ea3cb153c84de2b992533e6f02c035b7b178dab7d95f42829:wronglength'
      );
      expect(result).toBe(false);
    });
  });
});