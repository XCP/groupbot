/**
 * Bitcoin Message Signature Verification
 *
 * Comprehensive implementation supporting:
 * - BIP-322: Simple, Legacy, and Full verification
 * - BIP-137: All address types (P2PKH, P2SH-P2WPKH, P2WPKH)
 * - Legacy signing format
 */

import { sha256 } from '@noble/hashes/sha2';
import { hmac } from '@noble/hashes/hmac';
import * as btc from '@scure/btc-signer';
import { hex, base64 } from '@scure/base';
import * as secp256k1 from '@noble/secp256k1';
import { formatMessageForSigning, normalizeMessage } from './messageUtils';

// Configure Bitcoin network (mainnet by default)
const NETWORK = btc.NETWORK;

// Required initialization for @noble/secp256k1
import { hashes } from '@noble/secp256k1';

if (!hashes.hmacSha256) {
  hashes.hmacSha256 = (key: Uint8Array, msg: Uint8Array): Uint8Array => {
    return hmac(sha256, key, msg);
  };
  hashes.sha256 = sha256;

  hashes.hmacSha256Async = async (key: Uint8Array, msg: Uint8Array): Promise<Uint8Array> => {
    return hmac(sha256, key, msg);
  };
  hashes.sha256Async = async (msg: Uint8Array): Promise<Uint8Array> => {
    return sha256(msg);
  };
}

// ============================================================================
// Type Definitions
// ============================================================================

type AddressType = 'P2PKH' | 'P2SH' | 'P2WPKH' | 'P2WSH' | 'P2TR' | 'unknown';

interface VerificationResult {
  valid: boolean;
  method?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Hash a message for signature verification
 */
function hashMessage(message: Uint8Array, doubleHash: boolean = true): Uint8Array {
  const firstHash = sha256(message);
  return doubleHash ? sha256(firstHash) : firstHash;
}

/**
 * Get the address type from an address string
 */
function getAddressType(address: string): AddressType {
  if (address.startsWith('1') || address.startsWith('m') || address.startsWith('n')) {
    return 'P2PKH';
  } else if (address.startsWith('3') || address.startsWith('2')) {
    return 'P2SH';
  } else if (address.startsWith('bc1q') || address.startsWith('tb1q')) {
    const decoded = address.substring(4);
    return decoded.length === 38 ? 'P2WPKH' : 'P2WSH';
  } else if (address.startsWith('bc1p') || address.startsWith('tb1p')) {
    return 'P2TR';
  }
  return 'unknown';
}

/**
 * Get the address type from a recovery flag (BIP-137)
 */
function getAddressTypeFromFlag(flag: number): string | null {
  if (flag >= 27 && flag <= 30) {
    return 'P2PKH (uncompressed)';
  } else if (flag >= 31 && flag <= 34) {
    return 'P2PKH (compressed)';
  } else if (flag >= 35 && flag <= 38) {
    return 'P2SH-P2WPKH';
  } else if (flag >= 39 && flag <= 42) {
    return 'P2WPKH';
  }
  return null;
}

/**
 * Recover public key from signature using ECDSA recovery
 */
function recoverPublicKey(
  messageHash: Uint8Array,
  signature: Uint8Array,
  recovery: number
): Uint8Array | null {
  try {
    const r = signature.slice(1, 33);
    const s = signature.slice(33, 65);

    const sigWithRecovery = new Uint8Array(65);
    sigWithRecovery[0] = recovery;
    sigWithRecovery.set(r, 1);
    sigWithRecovery.set(s, 33);

    const pubKey = secp256k1.recoverPublicKey(sigWithRecovery, messageHash);
    return pubKey;
  } catch (error) {
    console.error('Public key recovery failed:', error);
    return null;
  }
}

// ============================================================================
// BIP-322 Implementation
// ============================================================================

/**
 * BIP-322 tagged hash for message commitment
 */
function bip322MessageHash(message: string): Uint8Array {
  const tag = 'BIP0322-signed-message';
  const tagHash = sha256(new TextEncoder().encode(tag));
  const messageBytes = new TextEncoder().encode(message);

  const preimage = new Uint8Array(64 + messageBytes.length);
  preimage.set(tagHash, 0);
  preimage.set(tagHash, 32);
  preimage.set(messageBytes, 64);

  return sha256(preimage);
}

/**
 * Serialization helpers for BIP-322 transactions
 */
function writeUint32LE(n: number): Uint8Array {
  const bytes = new Uint8Array(4);
  bytes[0] = n & 0xff;
  bytes[1] = (n >> 8) & 0xff;
  bytes[2] = (n >> 16) & 0xff;
  bytes[3] = (n >> 24) & 0xff;
  return bytes;
}

function writeUint64LE(n: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number((n >> BigInt(i * 8)) & 0xffn);
  }
  return bytes;
}

function writeCompactSize(n: number): Uint8Array {
  if (n < 0xfd) {
    return new Uint8Array([n]);
  } else if (n <= 0xffff) {
    const bytes = new Uint8Array(3);
    bytes[0] = 0xfd;
    bytes[1] = n & 0xff;
    bytes[2] = (n >> 8) & 0xff;
    return bytes;
  } else if (n <= 0xffffffff) {
    const bytes = new Uint8Array(5);
    bytes[0] = 0xfe;
    bytes[1] = n & 0xff;
    bytes[2] = (n >> 8) & 0xff;
    bytes[3] = (n >> 16) & 0xff;
    bytes[4] = (n >> 24) & 0xff;
    return bytes;
  } else {
    throw new Error('Value too large for CompactSize');
  }
}

/**
 * Create the to_spend transaction for BIP-322
 */
function createToSpendTransaction(messageHash: Uint8Array, scriptPubKey: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [];

  // Version (4 bytes) - 0
  parts.push(writeUint32LE(0));

  // Input count - 1
  parts.push(writeCompactSize(1));

  // Input: Previous output hash (32 bytes of zeros)
  parts.push(new Uint8Array(32));

  // Previous output index - 0xFFFFFFFF
  parts.push(new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]));

  // Script: OP_0 PUSH32 messageHash
  const scriptSig = new Uint8Array(1 + 1 + 32);
  scriptSig[0] = 0x00; // OP_0
  scriptSig[1] = 0x20; // PUSH 32 bytes
  scriptSig.set(messageHash, 2);

  parts.push(writeCompactSize(scriptSig.length));
  parts.push(scriptSig);

  // Sequence - 0
  parts.push(writeUint32LE(0));

  // Output count - 1
  parts.push(writeCompactSize(1));

  // Output: Amount - 0
  parts.push(writeUint64LE(BigInt(0)));

  // Output script
  parts.push(writeCompactSize(scriptPubKey.length));
  parts.push(scriptPubKey);

  // Locktime - 0
  parts.push(writeUint32LE(0));

  // Concatenate all parts
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

/**
 * Create the to_sign transaction for BIP-322
 */
function createToSignTransaction(toSpendTxId: string): Uint8Array {
  const parts: Uint8Array[] = [];

  // Version - 0
  parts.push(writeUint32LE(0));

  // Marker and flag for witness transaction
  parts.push(new Uint8Array([0x00, 0x01]));

  // Input count - 1
  parts.push(writeCompactSize(1));

  // Previous output hash (reversed)
  const txidBytes = hex.decode(toSpendTxId);
  const reversedTxid = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    reversedTxid[i] = txidBytes[31 - i];
  }
  parts.push(reversedTxid);

  // Previous output index - 0
  parts.push(writeUint32LE(0));

  // Script length - 0 (witness transaction)
  parts.push(writeCompactSize(0));

  // Sequence - 0
  parts.push(writeUint32LE(0));

  // Output count - 1
  parts.push(writeCompactSize(1));

  // Output: Amount - 0
  parts.push(writeUint64LE(BigInt(0)));

  // Output script: OP_RETURN
  const opReturn = new Uint8Array([0x6a]);
  parts.push(writeCompactSize(opReturn.length));
  parts.push(opReturn);

  // Witness data placeholder (will be filled later)
  // For now, empty witness
  parts.push(new Uint8Array([0x00]));

  // Locktime - 0
  parts.push(writeUint32LE(0));

  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

/**
 * Create to_sign transaction for BIP-322 (without witness)
 * This creates the transaction with empty scriptSig first
 */
function createToSignTransactionLegacy(toSpendTxId: string): Uint8Array {
  const parts: Uint8Array[] = [];

  // Version - 0
  parts.push(writeUint32LE(0));

  // Input count - 1
  parts.push(writeCompactSize(1));

  // Previous output hash (reversed)
  const txidBytes = hex.decode(toSpendTxId);
  const reversedTxid = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    reversedTxid[i] = txidBytes[31 - i];
  }
  parts.push(reversedTxid);

  // Previous output index - 0
  parts.push(writeUint32LE(0));

  // Empty script (will be replaced for signing)
  parts.push(writeCompactSize(0));

  // Sequence - 0
  parts.push(writeUint32LE(0));

  // Output count - 1
  parts.push(writeCompactSize(1));

  // Output: Amount - 0
  parts.push(writeUint64LE(BigInt(0)));

  // Output script: OP_RETURN
  parts.push(new Uint8Array([0x01, 0x6a])); // length 1, OP_RETURN

  // Locktime - 0
  parts.push(writeUint32LE(0));

  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

/**
 * Calculate legacy sighash for P2PKH
 */
function calculateLegacySighash(
  transaction: Uint8Array,
  inputIndex: number,
  scriptCode: Uint8Array,
  sighashType: number
): Uint8Array {
  // For P2PKH BIP-322, we need to insert the scriptPubKey into the empty scriptSig
  // The empty script length is at position 42 in our to_sign transaction

  // Build the transaction with scriptPubKey inserted
  const parts: Uint8Array[] = [];

  // Everything before script length (position 42)
  parts.push(transaction.slice(0, 42));

  // New script length and script
  parts.push(writeCompactSize(scriptCode.length));
  parts.push(scriptCode);

  // Everything after the empty script (position 43 onwards)
  parts.push(transaction.slice(43));

  // Concatenate
  const withScript = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    withScript.set(part, offset);
    offset += part.length;
  }

  // Append sighash type and double SHA256
  const withSighashType = new Uint8Array(withScript.length + 4);
  withSighashType.set(withScript, 0);
  withSighashType.set(writeUint32LE(sighashType), withScript.length);

  return sha256(sha256(withSighashType));
}

/**
 * Calculate witness v0 sighash for P2WPKH/P2SH-P2WPKH
 */
function calculateWitnessV0Sighash(
  prevOuts: Uint8Array,
  sequences: Uint8Array,
  outpoint: Uint8Array,
  scriptCode: Uint8Array,
  amount: bigint,
  sequence: number,
  outputs: Uint8Array,
  locktime: number,
  sighashType: number
): Uint8Array {
  const parts: Uint8Array[] = [];

  // Version
  parts.push(writeUint32LE(0));

  // hashPrevouts
  parts.push(sha256(sha256(prevOuts)));

  // hashSequence
  parts.push(sha256(sha256(sequences)));

  // Outpoint
  parts.push(outpoint);

  // Script code
  parts.push(writeCompactSize(scriptCode.length));
  parts.push(scriptCode);

  // Amount
  parts.push(writeUint64LE(amount));

  // Sequence
  parts.push(writeUint32LE(sequence));

  // hashOutputs
  parts.push(sha256(sha256(outputs)));

  // Locktime
  parts.push(writeUint32LE(locktime));

  // Sighash type
  parts.push(writeUint32LE(sighashType));

  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const preimage = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    preimage.set(part, offset);
    offset += part.length;
  }

  return sha256(sha256(preimage));
}

/**
 * Parse DER-encoded signature
 */
function parseDERSignature(der: Uint8Array): Uint8Array | null {
  try {
    if (der[0] !== 0x30) return null;

    let offset = 2;

    // Parse r
    if (der[offset] !== 0x02) return null;
    const rLen = der[offset + 1];
    const r = der.slice(offset + 2, offset + 2 + rLen);
    offset += 2 + rLen;

    // Parse s
    if (der[offset] !== 0x02) return null;
    const sLen = der[offset + 1];
    const s = der.slice(offset + 2, offset + 2 + sLen);

    // Remove padding and ensure 32 bytes
    const rBytes = r[0] === 0 ? r.slice(1) : r;
    const sBytes = s[0] === 0 ? s.slice(1) : s;

    // Pad to 32 bytes if needed
    const signature = new Uint8Array(64);
    signature.set(rBytes, 32 - rBytes.length);
    signature.set(sBytes, 64 - sBytes.length);

    return signature;
  } catch {
    return null;
  }
}

/**
 * Parse witness stack from BIP-322 signature
 */
function parseWitnessStack(data: Uint8Array): Uint8Array[] | null {
  try {
    let offset = 0;
    const stack: Uint8Array[] = [];

    // Read number of items
    if (offset >= data.length) return null;
    const itemCount = data[offset++];

    for (let i = 0; i < itemCount; i++) {
      if (offset >= data.length) return null;

      // Read item length
      let itemLen: number;
      if (data[offset] < 0xfd) {
        itemLen = data[offset++];
      } else if (data[offset] === 0xfd) {
        if (offset + 2 >= data.length) return null;
        offset++;
        itemLen = data[offset] | (data[offset + 1] << 8);
        offset += 2;
      } else {
        return null;
      }

      // Read item data
      if (offset + itemLen > data.length) return null;
      stack.push(data.slice(offset, offset + itemLen));
      offset += itemLen;
    }

    return stack;
  } catch {
    return null;
  }
}

// ============================================================================
// BIP-322 Verification Functions
// ============================================================================

/**
 * Verify BIP-322 Simple signature (Taproot)
 */
async function verifyBIP322Simple(
  message: string,
  signature: string,
  address: string
): Promise<boolean> {
  if (!signature.startsWith('tr:')) {
    return false;
  }

  if (!address.startsWith('bc1p') && !address.startsWith('tb1p')) {
    return false;
  }

  const sigHex = signature.slice(3);
  const parts = sigHex.split(':');

  if (parts.length === 2) {
    // Extended format with public key
    let sig = parts[0];
    const pubKey = parts[1];

    // Handle odd-length signature
    if (sig.length === 127) {
      sig = '0' + sig;
    }

    if (sig.length !== 128 || pubKey.length !== 64) {
      return false;
    }

    const sigBytes = hex.decode(sig);
    const pubKeyBytes = hex.decode(pubKey);

    // Calculate BIP-322 message hash
    const messageHash = bip322MessageHash(message);

    // Verify Schnorr signature
    const isValid = secp256k1.schnorr.verify(sigBytes, messageHash, pubKeyBytes);

    if (!isValid) {
      return false;
    }

    // Verify address matches
    const derivedAddress = btc.p2tr(pubKeyBytes, undefined, NETWORK).address;
    return derivedAddress === address;
  }

  return false;
}

/**
 * Verify BIP-322 Full signature (witness format)
 */
async function verifyBIP322Full(
  message: string,
  signature: string,
  address: string
): Promise<boolean> {
  try {
    const sigBytes = base64.decode(signature);

    // Parse witness stack
    const witnessStack = parseWitnessStack(sigBytes);
    if (!witnessStack || witnessStack.length < 2) {
      return false;
    }

    // Extract signature and public key
    const sigDER = witnessStack[0];
    const pubkey = witnessStack[1];

    // Remove sighash byte if present
    let sigForParsing = sigDER;
    if (sigDER[sigDER.length - 1] === 0x01) {
      sigForParsing = sigDER.slice(0, -1);
    }

    // Parse DER signature
    const parsedSig = parseDERSignature(sigForParsing);
    if (!parsedSig) {
      return false;
    }

    // Get address type and derive address
    const addressType = getAddressType(address);
    let derivedAddress: string;
    let scriptPubKey: Uint8Array;

    if (addressType === 'P2PKH') {
      const p2pkh = btc.p2pkh(pubkey, NETWORK);
      derivedAddress = p2pkh.address!;
      scriptPubKey = p2pkh.script!;
    } else if (addressType === 'P2WPKH') {
      const p2wpkh = btc.p2wpkh(pubkey, NETWORK);
      derivedAddress = p2wpkh.address!;
      scriptPubKey = p2wpkh.script!;
    } else if (addressType === 'P2SH') {
      // Assume P2SH-P2WPKH
      const p2wpkh = btc.p2wpkh(pubkey, NETWORK);
      const p2sh = btc.p2sh(p2wpkh, NETWORK);
      derivedAddress = p2sh.address!;
      scriptPubKey = p2sh.script!;
    } else {
      return false;
    }

    // Verify address matches
    if (derivedAddress.toLowerCase() !== address.toLowerCase()) {
      return false;
    }

    // Create BIP-322 message hash
    const messageHash = bip322MessageHash(message);

    // Create to_spend transaction
    const toSpend = createToSpendTransaction(messageHash, scriptPubKey);
    const toSpendTxId = hex.encode(sha256(sha256(toSpend)));

    // Calculate sighash based on address type
    let sighash: Uint8Array;

    if (addressType === 'P2PKH') {
      // Legacy P2PKH uses traditional sighash calculation
      // For BIP-322, we create a to_sign transaction with empty scriptSig
      const toSign = createToSignTransactionLegacy(toSpendTxId);
      sighash = calculateLegacySighash(toSign, 0, scriptPubKey, 0x01);
    } else {
      // SegWit addresses use BIP-143 sighash
      const txidBytes = hex.decode(toSpendTxId);
      const reversedTxid = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        reversedTxid[i] = txidBytes[31 - i];
      }

      const outpoint = new Uint8Array(36);
      outpoint.set(reversedTxid, 0);
      // index is 0, already zeros

      // Create script code for P2WPKH
      const pubkeyHash = btc.p2wpkh(pubkey, NETWORK).hash!;

      const scriptCode = btc.Script.encode(['DUP', 'HASH160', pubkeyHash, 'EQUALVERIFY', 'CHECKSIG']);

      // Create proper outputs for BIP-322
      const outputParts: Uint8Array[] = [];
      outputParts.push(writeUint64LE(BigInt(0))); // amount
      outputParts.push(new Uint8Array([0x01, 0x6a])); // script length 1, OP_RETURN

      const outputs = new Uint8Array(outputParts.reduce((sum, p) => sum + p.length, 0));
      let outputOffset = 0;
      for (const part of outputParts) {
        outputs.set(part, outputOffset);
        outputOffset += part.length;
      }

      sighash = calculateWitnessV0Sighash(
        outpoint, // prevOuts (the full 36-byte outpoint: txid + index)
        writeUint32LE(0), // sequences (just one sequence of 0)
        outpoint,
        scriptCode,
        BigInt(0), // amount
        0, // sequence
        outputs,
        0, // locktime
        0x01 // sighash type
      );
    }

    // Verify signature
    const isValid = secp256k1.verify(parsedSig, sighash, pubkey);
    return isValid;

  } catch (error) {
    console.debug('BIP-322 Full verification failed:', error);
    return false;
  }
}

// ============================================================================
// BIP-137 & Legacy Verification
// ============================================================================

/**
 * Verify BIP-137 / Legacy format signature
 */
async function verifyBIP137(
  message: string,
  signature: string,
  address: string
): Promise<boolean> {
  console.debug('BIP-137: Starting verification for', address);
  try {
    // Decode base64 signature
    let sigBytes: Uint8Array;
    try {
      sigBytes = base64.decode(signature);
      console.debug('BIP-137: Decoded signature, length:', sigBytes.length, 'first byte:', sigBytes[0]);
    } catch (e) {
      console.debug('BIP-137: Failed to decode signature:', e);
      return false;
    }

    // Check if it's a BIP-322 witness format
    // BIP-322 witness format starts with 0x02 (2 witness items)
    // BIP-137 uses recovery flags 27-42
    if (sigBytes.length > 3 && sigBytes[0] === 2) {
      console.debug('BIP-137: Detected BIP-322 format, forwarding to BIP322Full');
      return verifyBIP322Full(message, signature, address);
    }

    // Standard 65-byte signature
    if (sigBytes.length !== 65) {
      return false;
    }

    // Extract recovery flag
    const flag = sigBytes[0];

    // Format and hash the message
    const formattedMessage = formatMessageForSigning(message);
    const messageHash = hashMessage(formattedMessage, true);

    // Determine recovery id
    let recoveryId: number;

    if (flag >= 27 && flag <= 30) {
      recoveryId = flag - 27;
    } else if (flag >= 31 && flag <= 34) {
      recoveryId = flag - 31;
    } else if (flag >= 35 && flag <= 38) {
      recoveryId = flag - 35;
    } else if (flag >= 39 && flag <= 42) {
      recoveryId = flag - 39;
    } else {
      return false;
    }

    // Recover public key
    const publicKey = recoverPublicKey(messageHash, sigBytes, recoveryId);
    if (!publicKey) {
      console.debug('BIP-137: Failed to recover public key');
      return false;
    }

    console.debug('BIP-137: Recovered public key:', hex.encode(publicKey));

    // Derive address based on flag
    let derivedAddress: string;

    if (flag >= 27 && flag <= 34) {
      // P2PKH
      derivedAddress = btc.p2pkh(publicKey, NETWORK).address!;
    } else if (flag >= 35 && flag <= 38) {
      // P2SH-P2WPKH
      const p2wpkh = btc.p2wpkh(publicKey, NETWORK);
      derivedAddress = btc.p2sh(p2wpkh, NETWORK).address!;
    } else if (flag >= 39 && flag <= 42) {
      // P2WPKH
      derivedAddress = btc.p2wpkh(publicKey, NETWORK).address!;
    } else {
      return false;
    }

    console.debug('BIP-137: Derived address:', derivedAddress);
    console.debug('BIP-137: Expected address:', address);
    console.debug('BIP-137: Match:', derivedAddress.toLowerCase() === address.toLowerCase());

    return derivedAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    return false;
  }
}

// ============================================================================
// Main Verification Functions
// ============================================================================

/**
 * Verify a signed message with full validation
 * Implements complete BIP-322, BIP-137, and Legacy support
 */
export async function verifySignatureBip322(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  const result = await verifyMessageWithMethod(message, signature, address);
  return result.valid;
}

/**
 * Verify a signed message and return the method used
 */
export async function verifyMessageWithMethod(
  message: string,
  signature: string,
  address: string
): Promise<VerificationResult> {
  console.debug('Starting signature verification:', {
    address,
    messagePreview: message.substring(0, 50) + '...',
    signaturePreview: signature.substring(0, 30) + '...',
    signatureLength: signature.length,
    messageLength: message.length
  });

  try {
    // Normalize the message
    const normalizedMessage = normalizeMessage(message);

    // 1. Try BIP-322 Simple (Taproot)
    if (signature.startsWith('tr:')) {
      console.debug('Attempting BIP-322 Simple verification...');
      const isValid = await verifyBIP322Simple(normalizedMessage, signature, address);
      if (isValid) {
        return { valid: true, method: 'BIP-322 Simple (Taproot)' };
      }
    }

    // 2. Try BIP-322 Full (witness format)
    try {
      const sigBytes = base64.decode(signature);
      if (sigBytes.length > 3 && sigBytes[0] >= 2) {
        console.debug('Attempting BIP-322 Full verification...');
        const isValid = await verifyBIP322Full(normalizedMessage, signature, address);
        if (isValid) {
          const addressType = getAddressType(address);
          return { valid: true, method: `BIP-322 Full (${addressType})` };
        }
      }
    } catch {
      // Not a base64 signature, continue
    }

    // 3. Try BIP-137 / Legacy format
    console.debug('Attempting BIP-137/Legacy verification...');
    const isValid = await verifyBIP137(normalizedMessage, signature, address);
    if (isValid) {
      const addressType = getAddressType(address);
      if (addressType === 'P2WPKH') {
        return { valid: true, method: 'BIP-137 (Native SegWit)' };
      } else if (addressType === 'P2SH') {
        return { valid: true, method: 'BIP-137 (Nested SegWit)' };
      } else {
        return { valid: true, method: 'Legacy' };
      }
    }

    console.debug('All verification methods failed');
    return { valid: false };
  } catch (error) {
    console.error('Message verification failed:', error);
    return { valid: false };
  }
}

/**
 * Parse a signature to extract its components
 */
export function parseSignature(signature: string): {
  valid: boolean;
  type?: string;
  flag?: number;
  r?: string;
  s?: string;
} {
  // Handle Taproot signatures (BIP-322 Simple)
  if (signature.startsWith('tr:')) {
    const parts = signature.slice(3).split(':');
    if (parts.length === 2) {
      let sigHex = parts[0];
      const pubKeyHex = parts[1];

      if (sigHex.length === 127) {
        sigHex = '0' + sigHex;
      }

      if (sigHex.length === 128 && pubKeyHex.length === 64) {
        return {
          valid: true,
          type: 'BIP-322 Simple (Taproot)',
          r: sigHex.slice(0, 64),
          s: sigHex.slice(64, 128)
        };
      }
    }
    return { valid: false };
  }

  // Try to decode as base64
  try {
    const sigBytes = base64.decode(signature);

    // Check if it's a BIP-322 witness format
    if (sigBytes.length > 3 && sigBytes[0] >= 2) {
      const witnessStack = parseWitnessStack(sigBytes);
      if (witnessStack && witnessStack.length >= 2) {
        const sigDER = witnessStack[0];
        let sigForParsing = sigDER;
        if (sigDER[sigDER.length - 1] === 0x01) {
          sigForParsing = sigDER.slice(0, -1);
        }

        const parsed = parseDERSignature(sigForParsing);
        if (parsed) {
          return {
            valid: true,
            type: 'BIP-322 Full',
            r: hex.encode(parsed.slice(0, 32)),
            s: hex.encode(parsed.slice(32, 64))
          };
        }
      }
    }

    // Check for standard 65-byte signature
    if (sigBytes.length === 65) {
      const flag = sigBytes[0];
      const r = hex.encode(sigBytes.slice(1, 33));
      const s = hex.encode(sigBytes.slice(33, 65));

      const addressType = getAddressTypeFromFlag(flag);
      if (!addressType) {
        return { valid: false };
      }

      return {
        valid: true,
        type: addressType,
        flag,
        r,
        s
      };
    }

    return { valid: false };
  } catch {
    return { valid: false };
  }
}