#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * DSSE Attestation Builder
 *
 * Builds DSSE envelopes with canonical JSON payload signing.
 * Signs detached over exact bytes of canonical JSON.
 *
 * Usage:
 *   node scripts/attest/build.mjs receipts/attest/provenance.json > receipts/attest/envelope.json
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import nacl from 'tweetnacl';
import { canonicalize, toBytes } from './canonical-json.mjs';

/**
 * Get Ed25519 secret key from environment
 */
function getEd25519Secret() {
  const secretHex = process.env.PL_ED25519_SECRET;
  if (!secretHex) {
    throw new Error('PL_ED25519_SECRET environment variable required (32-byte hex string)');
  }

  if (!/^[0-9a-fA-F]{64}$/.test(secretHex)) {
    throw new Error('PL_ED25519_SECRET must be a 64-character hex string (32 bytes)');
  }

  return Uint8Array.from(Buffer.from(secretHex, 'hex'));
}

/**
 * Derive public key and key ID from secret seed
 */
function derivePublicKey(secretSeed) {
  const keyPair = nacl.sign.keyPair.fromSeed(secretSeed);
  const keyId = createHash('sha256').update(keyPair.publicKey).digest('hex').slice(0, 16);

  return {
    publicKey: keyPair.publicKey,
    keyId
  };
}

/**
 * Sign canonical JSON bytes with Ed25519 detached signature
 */
function signCanonicalBytes(canonicalBytes, secretSeed) {
  const keyPair = nacl.sign.keyPair.fromSeed(secretSeed);
  const signature = nacl.sign.detached(canonicalBytes, keyPair.secretKey);
  return Buffer.from(signature).toString('base64');
}

/**
 * Build DSSE envelope from provenance file
 */
function buildEnvelope(provenanceFile) {
  // Read and parse provenance
  const provenanceContent = readFileSync(provenanceFile, 'utf8');

  let provenance;
  try {
    provenance = JSON.parse(provenanceContent);
  } catch (error) {
    throw new Error(`Invalid provenance JSON: ${error.message}`);
  }

  // Basic validation
  if (!provenance.ts || !provenance.gitRev) {
    throw new Error('Invalid provenance: missing required fields (ts, gitRev)');
  }

  // Canonicalize payload - this is the SAME routine that verify will use
  const canonicalPayload = canonicalize(provenance);
  const canonicalBytes = toBytes(canonicalPayload);

  // Get secret key and derive public key
  const secretSeed = getEd25519Secret();
  const { keyId } = derivePublicKey(secretSeed);

  // Sign detached over exact bytes of canonical JSON
  const signatureBase64 = signCanonicalBytes(canonicalBytes, secretSeed);

  // Build DSSE envelope
  const envelope = {
    payload: Buffer.from(canonicalPayload, 'utf8').toString('base64'),
    payloadType: 'purelambda/provenance+json',
    signatures: [{
      keyid: keyId,
      sig: signatureBase64
    }]
  };

  return envelope;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.error('Usage: node scripts/attest/build.mjs <provenance-file>');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/attest/build.mjs receipts/attest/provenance.json > receipts/attest/envelope.json');
    process.exit(1);
  }

  const provenanceFile = args[0];

  try {
    const envelope = buildEnvelope(provenanceFile);
    console.log(JSON.stringify(envelope, null, 2));
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { buildEnvelope };