const signature = 'AkcwRAIgAju6xQv/5f8D/546qT+I7g1TnUBWoqfXIA46R1ZGBc8CIF/cykLbEXZt4D4uZdo5yLeTDd5X2tFKjGsBGYHTUNkbASEDLvzTTCBw2Pyeqk21met3LHKALlTVdaewWksr78H3528=';

// Decode base64
const decoded = Buffer.from(signature, 'base64');
console.log('Decoded length:', decoded.length, 'bytes');
console.log('Hex:', decoded.toString('hex'));
console.log('\nByte analysis:');

// Check if it's DER encoded
if (decoded[0] === 0x02 && decoded[1] === 0x47) {
  console.log('Looks like it starts with 0x0247 - might be a specific wallet format');
}

// Check for DER sequence
if (decoded[0] === 0x30) {
  console.log('Starts with 0x30 - DER SEQUENCE tag');
  const sequenceLength = decoded[1];
  console.log('Sequence length:', sequenceLength);
}

// Parse as potential DER signature
let offset = 0;
if (decoded[offset] === 0x02) {
  console.log('\nFirst byte is 0x02 - INTEGER tag');
  offset++;
  const length = decoded[offset];
  console.log('Length:', length);
  offset++;
  console.log('Data:', decoded.slice(offset, offset + length).toString('hex'));
}

// Check for recovery byte at the end
console.log('\nLast few bytes:', decoded.slice(-5).toString('hex'));
console.log('Last byte:', decoded[decoded.length - 1], '(0x' + decoded[decoded.length - 1].toString(16) + ')');