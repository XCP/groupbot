const { verifyMessage } = require('./src/lib/verifier');

async function testSignature() {
  const address = '19QWXpMXeLkoEKEJv2xo9rn8wkPCyxACSX';
  const message = 'Verify: telegram.xcp.io | User: 8129605510 | Chat: -1003031530212';
  const signature = 'AkcwRAIgAju6xQv/5f8D/546qT+I7g1TnUBWoqfXIA46R1ZGBc8CIF/cykLbEXZt4D4uZdo5yLeTDd5X2tFKjGsBGYHTUNkbASEDLvzTTCBw2Pyeqk21met3LHKALlTVdaewWksr78H3528=';

  console.log('Testing signature verification...\n');
  console.log('Address:', address);
  console.log('Message:', message);
  console.log('Message length:', message.length);
  console.log('Signature:', signature.substring(0, 50) + '...');
  console.log('Signature length:', signature.length);
  console.log('\n---\n');

  // Test exact message
  let result = await verifyMessage(message, signature, address, { strict: false });
  console.log('Exact message:', result);

  // Test with trailing space
  result = await verifyMessage(message + ' ', signature, address, { strict: false });
  console.log('With trailing space:', result);

  // Test with newline
  result = await verifyMessage(message + '\n', signature, address, { strict: false });
  console.log('With newline:', result);

  // Test with CRLF
  result = await verifyMessage(message + '\r\n', signature, address, { strict: false });
  console.log('With CRLF:', result);
}

testSignature().catch(console.error);