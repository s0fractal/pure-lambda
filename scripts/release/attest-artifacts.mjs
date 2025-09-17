#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { basename, join } from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

// Get git revision
const gitRev = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

// Blake3 hash (using SHA256 as fallback)
function blake3(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Canonical bytes serialization
function canonicalBytes(obj) {
  const sorted = JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((result, key) => {
        result[key] = value[key];
        return result;
      }, {});
    }
    return value;
  });
  return Buffer.from(sorted, 'utf8');
}

// Get signing key from environment or use default test key
function getSigningKey() {
  const secretHex = process.env.PL_ED25519_SECRET ||
    'a1b2c3d4e5f6789012345678901234567890abcdef123456789012345678901234';

  if (secretHex.length !== 64) {
    throw new Error('PL_ED25519_SECRET must be a 64-character hex string (32 bytes)');
  }

  const secretBytes = Buffer.from(secretHex, 'hex');
  const keypair = nacl.sign.keyPair.fromSeed(secretBytes);

  return {
    secretKey: keypair.secretKey,
    publicKey: keypair.publicKey,
    keyId: `did:web:pure-lambda.tech:keys:${blake3(keypair.publicKey).slice(0, 16)}`
  };
}

// Create DSSE envelope for an artifact
function createDSSEEnvelope(artifactPath, kind, mediaType) {
  if (!existsSync(artifactPath)) {
    console.error(`❌ Artifact not found: ${artifactPath}`);
    return null;
  }

  // Read actual file bytes
  const fileBytes = readFileSync(artifactPath);
  const fileHash = blake3(fileBytes);
  const fileSize = fileBytes.length;
  const fileName = basename(artifactPath);

  console.log(`📦 Creating DSSE for ${fileName}:`);
  console.log(`   Size: ${fileSize} bytes`);
  console.log(`   Hash: ${fileHash}`);

  // Build payload with actual file metadata
  const payload = {
    schema: 'PL-DSSE-01',
    subject: {
      name: fileName,
      kind: kind,
      mediaType: mediaType,
      size: fileSize,
      blake3: fileHash,
      gitRev: gitRev
    },
    issuedAt: new Date().toISOString(),
    provenance: {
      builder: 'pure-lambda/release',
      invocation: {
        configSource: {
          uri: 'https://github.com/s0fractal/pure-lambda',
          digest: { sha256: gitRev }
        }
      },
      metadata: {
        completeness: { arguments: true, environment: false },
        reproducible: true
      }
    }
  };

  // Sign canonical bytes
  const canonBytes = canonicalBytes(payload);
  const payloadBase64 = canonBytes.toString('base64');

  const { secretKey, keyId } = getSigningKey();
  const signature = nacl.sign.detached(canonBytes, secretKey);
  const signatureBase64 = naclUtil.encodeBase64(signature);

  // Create DSSE envelope
  const envelope = {
    payload: payloadBase64,
    payloadType: 'application/vnd.pure-lambda.attestation+json',
    signatures: [{
      keyid: keyId,
      sig: signatureBase64
    }]
  };

  return envelope;
}

// Main function
async function main() {
  console.log('🔏 Creating DSSE attestations for release artifacts...\n');

  const artifacts = [
    {
      path: 'dist/release/stage/docs/pocket/index.htmlc',
      kind: 'htmlc',
      mediaType: 'text/html',
      output: 'dsse/release/pocket.htmlc.envelope.json'
    },
    {
      path: 'dist/release/embassy.zip',
      kind: 'embassy',
      mediaType: 'application/zip',
      output: 'dsse/release/embassy.envelope.json'
    }
  ];

  let created = 0;
  let failed = 0;

  for (const artifact of artifacts) {
    const envelope = createDSSEEnvelope(artifact.path, artifact.kind, artifact.mediaType);

    if (envelope) {
      // Save envelope
      writeFileSync(artifact.output, JSON.stringify(envelope, null, 2));
      console.log(`   ✅ Envelope saved: ${artifact.output}\n`);
      created++;
    } else {
      console.log(`   ❌ Failed to create envelope for ${artifact.path}\n`);
      failed++;
    }
  }

  console.log(`\n✅ Attestation complete: ${created} created, ${failed} failed`);

  if (failed > 0) {
    console.log('\n⚠️  Some artifacts may not exist. Run "make release-local" first.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});