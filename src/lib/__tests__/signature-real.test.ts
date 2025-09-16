/**
 * Real signature verification tests
 * These are actual signatures that should verify correctly
 * Run with: npx tsx src/lib/__tests__/signature-real.test.ts
 */

import { describe, it } from 'vitest';
import { verifySignatureBip322, parseSignature, verifyMessageWithMethod } from '../signature';

// Color codes for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

interface TestCase {
  name: string;
  address: string;
  message: string;
  signature: string;
  shouldVerify: boolean;
}

const testCases: TestCase[] = [
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
    name: 'BIP-322 Taproot (bc1p)',
    address: 'bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9',
    message: 'Hello World',
    signature: 'tr:745d9365b64d65376bf5b3386508cb02e56dca6c52df6931eee55429b3aa6444da15b25c29d0208ea3cb153c84de2b992533e6f02c035b7b178dab7d95f42829:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    shouldVerify: true
  },
  {
    name: 'Wrong message (should fail)',
    address: 'bc1qhmfed7sgtc25m4p4md5eyvqnel6pf09wwsvx2r',
    message: 'wrong message',
    signature: 'J7mL14qBvSp5AB3utMXX4GYpcUn/pq5Y701KEoksa5AoFgmDbNMEUHqAJzvZwok6IIH2xmVgvDI46kH/hKrmc+I=',
    shouldVerify: false
  },
  {
    name: 'Wrong Taproot message (should fail)',
    address: 'bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9',
    message: 'Wrong Message',
    signature: 'tr:745d9365b64d65376bf5b3386508cb02e56dca6c52df6931eee55429b3aa6444da15b25c29d0208ea3cb153c84de2b992533e6f02c035b7b178dab7d95f42829:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    shouldVerify: false
  }
];

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('Running Real Signature Verification Tests');
  console.log('='.repeat(70) + '\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    process.stdout.write(`Testing ${testCase.name}... `);

    try {
      const result = await verifyMessageWithMethod(
        testCase.message,
        testCase.signature,
        testCase.address
      );

      if (result.valid === testCase.shouldVerify) {
        const methodInfo = result.method ? ` (${result.method})` : '';
        console.log(`${GREEN}✓ PASS${RESET}${methodInfo}`);
        passed++;
      } else {
        console.log(`${RED}✗ FAIL${RESET} (expected ${testCase.shouldVerify}, got ${result.valid})`);
        failed++;
      }
    } catch (error) {
      console.log(`${RED}✗ ERROR${RESET} - ${error}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('Signature Parsing Tests');
  console.log('='.repeat(70) + '\n');

  const parseTests = [
    {
      name: 'Taproot BIP-322 format',
      signature: 'tr:' + '0'.repeat(128) + ':' + '1'.repeat(64),
      expectedType: 'BIP-322 Simple (Taproot)',
      expectedValid: true
    },
    {
      name: 'P2PKH compressed',
      signature: 'H7VCIZUmwlVCSUgiVP/nqReiMAsMXODcNdqVU9cF/RsXdalpY5RW/pIfEwdpPHJQnLwSLwvoVxhhoCiPsy9k44w=',
      expectedType: 'P2PKH (compressed)',
      expectedValid: true
    },
    {
      name: 'P2WPKH',
      signature: 'J7mL14qBvSp5AB3utMXX4GYpcUn/pq5Y701KEoksa5AoFgmDbNMEUHqAJzvZwok6IIH2xmVgvDI46kH/hKrmc+I=',
      expectedType: 'P2WPKH',
      expectedValid: true
    },
    {
      name: 'P2SH-P2WPKH',
      signature: 'I3k8wsB/kD5V38isNcGG3a5dNYRO7c564PqGGpCMvIRmAsUvbt9R+UYPQOEw8C2mryCo+xB0pZq1bkLaBvIVpmc=',
      expectedType: 'P2SH-P2WPKH',
      expectedValid: true
    }
  ];

  for (const test of parseTests) {
    process.stdout.write(`Parsing ${test.name}... `);

    const parsed = parseSignature(test.signature);

    if (parsed.valid === test.expectedValid && (!test.expectedValid || parsed.type === test.expectedType)) {
      console.log(`${GREEN}✓ PASS${RESET}`);
      passed++;
    } else {
      console.log(`${RED}✗ FAIL${RESET}`);
      console.log(`  Expected: valid=${test.expectedValid}, type=${test.expectedType}`);
      console.log(`  Got: valid=${parsed.valid}, type=${parsed.type}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Test Results: ${GREEN}${passed} passed${RESET}, ${failed > 0 ? RED : ''}${failed} failed${RESET}`);
  console.log('='.repeat(70) + '\n');

  // Don't use process.exit in vitest
  if (failed > 0) {
    throw new Error(`${failed} tests failed`);
  }
}

// Create a proper vitest test
describe('Signature Real Tests', () => {
  it('should run all signature tests', async () => {
    await runTests();
  });
});