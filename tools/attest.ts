#!/usr/bin/env npx ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * DSSE-like attestation envelope signing and verification
 *
 * Usage:
 *   ts-node tools/attest.ts receipts/attest/provenance.json > receipts/attest/envelope.json
 *   ts-node tools/attest.ts --verify receipts/attest/envelope.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { createHash, randomBytes } from 'crypto';
import nacl from 'tweetnacl';

interface DSSEEnvelope {
  payloadType: string;
  payloadBase64: string;
  signatures: Array<{
    keyid: string;
    sigBase64: string;
  }>;
}

interface AttestationData {
  ts: string;
  gitRev: string;
  tools: {
    node: string;
    tsnode: string;
    pkg: string;
  };
  inputs: {
    fixturesHash: string | null;
  };
  outputs: {
    files: Array<{
      path: string;
      hash: string;
    }>;
  };
  rulesHash: string | null;
  autopilot: {
    Lbest: number | null;
    routeLen: number | null;
  };
  nf: {
    patchCount: number;
    delta: {
      hops: number | null;
      lat: number | null;
      mem: number | null;
    } | null;
  };
}

function getEd25519Secret(): Uint8Array {
  const secretHex = process.env.PL_ED25519_SECRET;
  if (!secretHex) {
    throw new Error('PL_ED25519_SECRET environment variable required (32-byte hex string)');
  }

  if (!/^[0-9a-fA-F]{64}$/.test(secretHex)) {
    throw new Error('PL_ED25519_SECRET must be a 64-character hex string (32 bytes)');
  }

  return Uint8Array.from(Buffer.from(secretHex, 'hex'));
}

function generateKeyPair(): { secretKey: Uint8Array; publicKey: Uint8Array; keyId: string } {
  const keyPair = nacl.sign.keyPair();
  const keyId = createHash('sha256').update(keyPair.publicKey).digest('hex').slice(0, 16);

  return {
    secretKey: keyPair.secretKey,
    publicKey: keyPair.publicKey,
    keyId
  };
}

function derivePublicKey(secretSeed: Uint8Array): { publicKey: Uint8Array; keyId: string } {
  const keyPair = nacl.sign.keyPair.fromSeed(secretSeed);
  const keyId = createHash('sha256').update(keyPair.publicKey).digest('hex').slice(0, 16);

  return {
    publicKey: keyPair.publicKey,
    keyId
  };
}

function signPayload(payload: string, secretSeed: Uint8Array): string {
  const payloadBytes = Buffer.from(payload, 'utf8');
  const keyPair = nacl.sign.keyPair.fromSeed(secretSeed);
  const signature = nacl.sign.detached(payloadBytes, keyPair.secretKey);
  return Buffer.from(signature).toString('base64');
}

function verifySignature(payload: string, signatureBase64: string, publicKeyBase64: string): boolean {
  try {
    const payloadBytes = Buffer.from(payload, 'utf8');
    const signature = Buffer.from(signatureBase64, 'base64');
    const publicKey = Buffer.from(publicKeyBase64, 'base64');

    return nacl.sign.detached.verify(payloadBytes, signature, publicKey);
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}

function createEnvelope(provenanceFile: string): DSSEEnvelope {
  // Read and validate provenance
  const provenanceContent = readFileSync(provenanceFile, 'utf8');

  try {
    const provenance: AttestationData = JSON.parse(provenanceContent);
    // Basic validation
    if (!provenance.ts || !provenance.gitRev) {
      throw new Error('Invalid provenance: missing required fields');
    }
  } catch (error) {
    throw new Error(`Invalid provenance JSON: ${error}`);
  }

  // Get secret key and derive public key
  const secretSeed = getEd25519Secret();
  const { keyId } = derivePublicKey(secretSeed);

  // Create DSSE envelope
  const payloadBase64 = Buffer.from(provenanceContent, 'utf8').toString('base64');
  const signatureBase64 = signPayload(provenanceContent, secretSeed);

  const envelope: DSSEEnvelope = {
    payloadType: 'purelambda/provenance+json',
    payloadBase64,
    signatures: [{
      keyid: keyId,
      sigBase64: signatureBase64
    }]
  };

  return envelope;
}

function verifyEnvelope(envelopeFile: string): boolean {
  try {
    const envelopeContent = readFileSync(envelopeFile, 'utf8');
    const envelope: DSSEEnvelope = JSON.parse(envelopeContent);

    // Basic envelope validation
    if (envelope.payloadType !== 'purelambda/provenance+json') {
      console.error(`Invalid payload type: ${envelope.payloadType}`);
      return false;
    }

    if (!envelope.payloadBase64 || !Array.isArray(envelope.signatures) || envelope.signatures.length === 0) {
      console.error('Invalid envelope structure');
      return false;
    }

    // Decode payload
    const payload = Buffer.from(envelope.payloadBase64, 'base64').toString('utf8');

    // Validate provenance structure
    try {
      const provenance: AttestationData = JSON.parse(payload);
      if (!provenance.ts || !provenance.gitRev) {
        console.error('Invalid provenance: missing required fields');
        return false;
      }
    } catch (error) {
      console.error('Invalid provenance in payload:', error);
      return false;
    }

    // For verification, we need the public key
    // In a real system, this would come from a trusted key store
    // For now, we'll try to derive it from the secret key if available
    let publicKeyForVerification: Uint8Array | null = null;

    try {
      const secretSeed = getEd25519Secret();
      const { publicKey, keyId } = derivePublicKey(secretSeed);

      // Check if any signature matches our key
      const matchingSignature = envelope.signatures.find(sig => sig.keyid === keyId);
      if (matchingSignature) {
        publicKeyForVerification = publicKey;
      }
    } catch {
      // Secret key not available, cannot verify
      console.warn('PL_ED25519_SECRET not available for verification');
    }

    // Verify signatures
    let validSignatures = 0;
    for (const signature of envelope.signatures) {
      if (publicKeyForVerification) {
        const secretSeed = getEd25519Secret();
        const { keyId } = derivePublicKey(secretSeed);
        if (signature.keyid === keyId) {
          const publicKeyBase64 = Buffer.from(publicKeyForVerification).toString('base64');
          const isValid = verifySignature(payload, signature.sigBase64, publicKeyBase64);

          if (isValid) {
            console.log(`✅ Signature verified for key: ${signature.keyid}`);
            validSignatures++;
          } else {
            console.error(`❌ Invalid signature for key: ${signature.keyid}`);
            return false;
          }
        }
      } else {
        console.warn(`⚠️  Cannot verify signature for key: ${signature.keyid} (no public key available)`);
      }
    }

    if (validSignatures === 0) {
      console.error('No valid signatures found');
      return false;
    }

    console.log(`✅ Envelope verified with ${validSignatures} valid signature(s)`);
    return true;

  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage:');
    console.error('  ts-node tools/attest.ts <provenance-file>');
    console.error('  ts-node tools/attest.ts --verify <envelope-file>');
    process.exit(1);
  }

  if (args[0] === '--verify') {
    if (args.length !== 2) {
      console.error('Usage: ts-node tools/attest.ts --verify <envelope-file>');
      process.exit(1);
    }

    const success = verifyEnvelope(args[1]!);
    process.exit(success ? 0 : 1);
  } else {
    // Create envelope
    if (args.length !== 1) {
      console.error('Usage: ts-node tools/attest.ts <provenance-file>');
      process.exit(1);
    }

    try {
      const envelope = createEnvelope(args[0]!);
      console.log(JSON.stringify(envelope, null, 2));
    } catch (error) {
      console.error('Failed to create envelope:', error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main();
}

export { createEnvelope, verifyEnvelope, generateKeyPair };