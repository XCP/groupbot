/**
 * Message utilities for Bitcoin message signing
 * Based on XCP Wallet extension implementation
 */

/**
 * Normalize message to handle different line ending formats
 * Ensures consistent message format regardless of platform
 */
export function normalizeMessage(message: string): string {
  return message
    .trim()
    // Normalize all line endings to \n
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Format message for Bitcoin message signing
 * Adds the Bitcoin message prefix as per the standard
 */
export function formatMessageForSigning(message: string): Uint8Array {
  const messageBuffer = new TextEncoder().encode(message);
  const prefix = new TextEncoder().encode('\x18Bitcoin Signed Message:\n');

  // Create varint for message length
  const messageLengthVarint = createVarint(messageBuffer.length);

  // Combine prefix + length + message
  const totalLength = prefix.length + messageLengthVarint.length + messageBuffer.length;
  const result = new Uint8Array(totalLength);

  let offset = 0;
  result.set(prefix, offset);
  offset += prefix.length;
  result.set(messageLengthVarint, offset);
  offset += messageLengthVarint.length;
  result.set(messageBuffer, offset);

  return result;
}

/**
 * Create a varint (variable-length integer) for message length
 * Bitcoin uses varints to encode lengths in messages
 */
function createVarint(n: number): Uint8Array {
  if (n < 0xfd) {
    return new Uint8Array([n]);
  } else if (n <= 0xffff) {
    const buf = new Uint8Array(3);
    buf[0] = 0xfd;
    buf[1] = n & 0xff;
    buf[2] = (n >> 8) & 0xff;
    return buf;
  } else if (n <= 0xffffffff) {
    const buf = new Uint8Array(5);
    buf[0] = 0xfe;
    buf[1] = n & 0xff;
    buf[2] = (n >> 8) & 0xff;
    buf[3] = (n >> 16) & 0xff;
    buf[4] = (n >> 24) & 0xff;
    return buf;
  } else {
    throw new Error('Message too long');
  }
}


/**
 * Compare two messages accounting for line ending differences
 */
export function messagesMatch(message1: string, message2: string): boolean {
  return normalizeMessage(message1) === normalizeMessage(message2);
}

/**
 * Get the expected message format for Telegram verification
 * Using a single-line format to avoid line ending issues
 */
export function getTelegramMessage(userId: string, chatId: string): string {
  return `Verify: telegram.xcp.io | User: ${userId} | Chat: ${chatId}`;
}

/**
 * Validate that a message matches the expected Telegram format
 */
export function isValidTelegramMessage(
  message: string,
  userId: string,
  chatId: string
): boolean {
  const normalized = normalizeMessage(message);
  const expected = getTelegramMessage(userId, chatId);

  // Simple exact match for single-line format
  return normalized === expected;
}