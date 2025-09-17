#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * DSSE Attestation Verifier
 *
 * Verifies DSSE envelopes using canonical JSON payload verification.
 * Validates DID registry entries and temporal bounds.
 * On signature failure, prints hexdiff of first 64 bytes (signBytes vs verifyBytes).
 *
 * Usage:
 *   node scripts/attest/verify.mjs receipts/attest/envelope.json
 */

import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import * as path from 'path';
import nacl from 'tweetnacl';
import { canonicalize, toBytes } from './canonical-json.mjs';

/**
 * Get Ed25519 secret key from environment (for deriving public key)
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
 * Load DID registry and validate DID
 */
function validateDID(did, expectedRole = null) {
  const registryPath = path.join(process.cwd(), 'registry', 'dids.json');

  if (!existsSync(registryPath)) {
    console.warn('⚠️ DID registry not found, skipping DID validation');
    return { valid: true, warning: 'No registry' };
  }

  try {
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    const entry = registry.dids.find(d => d.did === did);

    if (!entry) {
      return { valid: false, reason: `DID not found in registry: ${did}` };
    }

    // Check temporal bounds
    const now = new Date();
    const notBefore = new Date(entry.not_before);
    const notAfter = new Date(entry.not_after);

    if (now < notBefore) {
      return { valid: false, reason: `DID not yet valid (starts ${entry.not_before})` };
    }

    if (now > notAfter) {
      return { valid: false, reason: `DID expired (ended ${entry.not_after})` };
    }

    // Check role if specified
    if (expectedRole && entry.role !== expectedRole) {
      return {
        valid: false,
        reason: `Role mismatch: expected ${expectedRole}, got ${entry.role}`,
        warning: true
      };
    }

    return {
      valid: true,
      entry: entry,
      role: entry.role
    };

  } catch (error) {
    console.warn('⚠️ Failed to load DID registry:', error.message);
    return { valid: true, warning: 'Registry error' };
  }
}

/**
 * Verify Ed25519 detached signature against canonical bytes
 */
function verifyCanonicalBytes(canonicalBytes, signatureBase64, publicKey) {
  try {
    const signature = Buffer.from(signatureBase64, 'base64');
    return nacl.sign.detached.verify(canonicalBytes, signature, publicKey);
  } catch (error) {
    console.error('Signature verification error:', error.message);
    return false;
  }
}

/**
 * Format bytes as hex string for debugging
 */
function toHex(bytes, limit = 64) {
  return Buffer.from(bytes.slice(0, limit)).toString('hex');
}

/**
 * Show hexdiff between two byte arrays
 */
function showHexDiff(signBytes, verifyBytes, limit = 64) {
  const signHex = toHex(signBytes, limit);
  const verifyHex = toHex(verifyBytes, limit);

  console.error('Hexdiff (first 64 bytes):');
  console.error(`Sign bytes:   ${signHex}`);
  console.error(`Verify bytes: ${verifyHex}`);

  // Show character-by-character diff
  let diffMarkers = '';
  for (let i = 0; i < Math.min(signHex.length, verifyHex.length); i++) {
    diffMarkers += (signHex[i] === verifyHex[i]) ? ' ' : '^';
  }
  console.error(`Differences:  ${diffMarkers}`);
}

/**
 * Verify DSSE envelope
 */
function verifyEnvelope(envelopeFile) {
  // Read and parse envelope
  const envelopeContent = readFileSync(envelopeFile, 'utf8');

  let envelope;
  try {
    envelope = JSON.parse(envelopeContent);
  } catch (error) {
    console.error('Invalid envelope JSON:', error.message);
    return false;
  }

  // Basic envelope validation
  if (envelope.payloadType !== 'purelambda/provenance+json') {
    console.error(`Invalid payload type: ${envelope.payloadType}`);
    return false;
  }

  if (!envelope.payload || !Array.isArray(envelope.signatures) || envelope.signatures.length === 0) {
    console.error('Invalid envelope structure: missing payload or signatures');
    return false;
  }

  // Decode payload from base64
  let payloadContent;
  try {
    payloadContent = Buffer.from(envelope.payload, 'base64').toString('utf8');
  } catch (error) {
    console.error('Failed to decode payload:', error.message);
    return false;
  }

  // Parse provenance from payload
  let provenance;
  try {
    provenance = JSON.parse(payloadContent);
  } catch (error) {
    console.error('Invalid provenance in payload:', error.message);
    return false;
  }

  // Basic provenance validation
  if ((!provenance.ts && !provenance.timestamp) || !provenance.gitRev) {
    console.error('Invalid provenance: missing required fields (ts/timestamp, gitRev)');
    return false;
  }

  // Check DID in payload if present
  if (provenance.signer?.did) {
    const didResult = validateDID(provenance.signer.did);
    if (!didResult.valid) {
      console.error(`❌ DID validation failed: ${didResult.reason}`);
      return false;
    }
    if (didResult.warning) {
      console.warn(`⚠️ DID warning: ${didResult.warning}`);
    }
    console.log(`✅ DID valid: ${provenance.signer.did} (role: ${didResult.role})`);
  }

  // Canonicalize payload - this is the SAME routine that build uses
  const canonicalPayload = canonicalize(provenance);
  const canonicalBytes = toBytes(canonicalPayload);

  // Get our public key for verification
  let ourPublicKey;
  let ourKeyId;
  try {
    const secretSeed = getEd25519Secret();
    const keyInfo = derivePublicKey(secretSeed);
    ourPublicKey = keyInfo.publicKey;
    ourKeyId = keyInfo.keyId;
  } catch (error) {
    console.error('Cannot derive public key for verification:', error.message);
    return false;
  }

  // Verify signatures
  let validSignatures = 0;
  let totalSignatures = 0;

  for (const signature of envelope.signatures) {
    totalSignatures++;

    if (signature.keyid === ourKeyId) {
      // This is our signature, verify it
      const isValid = verifyCanonicalBytes(canonicalBytes, signature.sig, ourPublicKey);

      if (isValid) {
        console.log(`✅ Signature verified for key: ${signature.keyid}`);
        validSignatures++;
      } else {
        console.error(`❌ Invalid signature for key: ${signature.keyid}`);

        // Show hexdiff for debugging
        // We need the original signing bytes for comparison
        // In this case, we can reconstruct what was probably signed
        const originalPayloadBytes = Buffer.from(payloadContent, 'utf8');

        console.error('\nDebugging signature failure:');
        console.error(`Canonical payload length: ${canonicalBytes.length} bytes`);
        console.error(`Original payload length: ${originalPayloadBytes.length} bytes`);

        showHexDiff(originalPayloadBytes, canonicalBytes);

        return false;
      }
    } else {
      console.warn(`⚠️  Cannot verify signature for key: ${signature.keyid} (not our key)`);
    }
  }

  if (validSignatures === 0) {
    console.error(`No valid signatures found (checked ${totalSignatures} signatures)`);
    return false;
  }

  console.log(`✅ Envelope verified with ${validSignatures}/${totalSignatures} valid signature(s)`);
  return true;
}

/**
 * Verify all 11 artifacts
 */
async function verifyAllArtifacts() {
  console.log('🔍 Verifying all artifacts...\n');

  try {
    // Import getAllArtifacts from audit.mjs
    const { getAllArtifacts } = await import('./audit.mjs');
    const artifacts = getAllArtifacts();

    if (artifacts.length === 0) {
      console.error('❌ No artifacts found for verification');
      process.exit(1);
    }

    console.log(`📋 Found ${artifacts.length} artifacts to verify`);

    let successful = 0;
    let failed = 0;

    for (const artifact of artifacts) {
      try {
        const success = verifyEnvelope(artifact.envelopePath);
        if (success) {
          console.log(`✅ ${artifact.name}: verified`);
          successful++;
        } else {
          console.log(`❌ ${artifact.name}: verification failed`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${artifact.name}: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Verification Summary:`);
    console.log(`  Successful: ${successful}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total: ${successful + failed}`);

    if (failed === 0) {
      console.log('\n🎉 All artifacts verified successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Some verifications failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to load artifacts:', error.message);
    process.exit(1);
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--all')) {
    verifyAllArtifacts();
    return;
  }

  if (args.length !== 1 || args.includes('--help') || args.includes('-h')) {
    console.error('Usage: node scripts/attest/verify.mjs <envelope-file>');
    console.error('       node scripts/attest/verify.mjs --all');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/attest/verify.mjs receipts/attest/envelope.json');
    console.error('  node scripts/attest/verify.mjs --all');
    process.exit(1);
  }

  const envelopeFile = args[0];

  try {
    const success = verifyEnvelope(envelopeFile);
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Verification failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { verifyEnvelope };