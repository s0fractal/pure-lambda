const fs = require('fs');
const path = require('path');

// Test envelope validation with actual trust scorer logic
function verifyDSSEEnvelope(envelope) {
  try {
    const validPayloadTypes = [
      'application/vnd.in-toto+json',
      'application/vnd.pure-lambda.attestation+json',
      'purelambda/provenance+json'
    ];

    if (!envelope.payloadType || (!validPayloadTypes.includes(envelope.payloadType) && !envelope.payload)) {
      console.log('  Failed: Invalid payload type:', envelope.payloadType);
      return false;
    }

    const hasPayload = envelope.payloadBase64 || envelope.payload;
    if (!hasPayload || !envelope.signatures || envelope.signatures.length === 0) {
      console.log('  Failed: Missing payload or signatures');
      return false;
    }

    const sig = envelope.signatures[0];
    if (!sig.keyid || !(sig.sigBase64 || sig.sig)) {
      console.log('  Failed: Invalid signature structure');
      return false;
    }

    return true;
  } catch (error) {
    console.log('  Failed with error:', error.message);
    return false;
  }
}

// Test with actual envelopes
const envelopes = [
  './dsse/garden/hello-city.envelope.json',
  './dsse/release/pocket.htmlc.envelope.json'
];

for (const envPath of envelopes) {
  console.log('\nTesting:', envPath);
  const content = JSON.parse(fs.readFileSync(envPath, 'utf8'));
  const valid = verifyDSSEEnvelope(content);
  console.log('  Valid:', valid);
}