const signature = 'AkcwRAIgAju6xQv/5f8D/546qT+I7g1TnUBWoqfXIA46R1ZGBc8CIF/cykLbEXZt4D4uZdo5yLeTDd5X2tFKjGsBGYHTUNkbASEDLvzTTCBw2Pyeqk21met3LHKALlTVdaewWksr78H3528=';
const decoded = Buffer.from(signature, 'base64');

console.log('Full hex:', decoded.toString('hex'));
console.log('\nBreaking it down:');

// Skip first two bytes (0x0247)
let offset = 2;
console.log('First 2 bytes (header?):', decoded.slice(0, 2).toString('hex'));

// Next should be DER signature
if (decoded[offset] === 0x30) {
  console.log('\nDER Signature found at offset', offset);
  const derLength = decoded[offset + 1];
  console.log('DER length:', derLength);
  const derSig = decoded.slice(offset, offset + 2 + derLength);
  console.log('DER signature:', derSig.toString('hex'));
  offset += 2 + derLength;
}

// Check what's after
console.log('\nRemaining bytes after DER:');
const remaining = decoded.slice(offset);
console.log('Length:', remaining.length);
console.log('Hex:', remaining.toString('hex'));

if (remaining[0] === 0x01 && remaining[1] === 0x21) {
  console.log('\nLooks like 0x0121 followed by 33 bytes - likely a compressed public key');
  const pubkey = remaining.slice(2);
  console.log('Public key:', pubkey.toString('hex'));
  console.log('Pubkey length:', pubkey.length);
  if (pubkey[0] === 0x02 || pubkey[0] === 0x03) {
    console.log('Valid compressed pubkey prefix:', '0x' + pubkey[0].toString(16));
  }
}