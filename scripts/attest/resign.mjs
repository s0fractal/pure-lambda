#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Attestation Re-signing Script
 *
 * Для кожного артефакту:
 * 1. Формує payload рівно тим самим payloadForSigning()
 * 2. Підписує ed25519 (tweetnacl), keyId з docs/keys/ROOT-PUBKEY.json
 * 3. Пише dsse/<name>.envelope.json
 * 4. Зразу verify тим самим canonicalBytes()
 *
 * Це гарантує що build та verify використовують ТОЧНО той самий процес.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { createHash } from 'crypto';
import nacl from 'tweetnacl';
import { canonicalBytes } from './canonical-bytes.mjs';
import { getAllArtifacts, payloadForSigning } from './audit.mjs';

/**
 * Отримує Ed25519 ключ з environment змінної
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
 * Виводить публічний ключ та keyId з секретного seed'а
 */
function derivePublicKey(secretSeed) {
  const keyPair = nacl.sign.keyPair.fromSeed(secretSeed);
  const keyId = createHash('sha256').update(keyPair.publicKey).digest('hex').slice(0, 16);

  return {
    publicKey: keyPair.publicKey,
    keyId,
    keyPair
  };
}

/**
 * Підписує канонічні байти з Ed25519 detached signature
 */
function signCanonicalBytes(canonicalBytesArray, secretSeed) {
  const keyPair = nacl.sign.keyPair.fromSeed(secretSeed);
  const signature = nacl.sign.detached(canonicalBytesArray, keyPair.secretKey);
  return Buffer.from(signature).toString('base64');
}

/**
 * Верифікує Ed25519 detached signature проти канонічних байтів
 */
function verifyCanonicalBytes(canonicalBytesArray, signatureBase64, publicKey) {
  try {
    const signature = Buffer.from(signatureBase64, 'base64');
    return nacl.sign.detached.verify(canonicalBytesArray, signature, publicKey);
  } catch (error) {
    console.error('Signature verification error:', error.message);
    return false;
  }
}

/**
 * Формує DSSE envelope для артефакту
 */
function createDSSEEnvelope(artifact, secretSeed) {
  // Формуємо payload ТАК САМО як у audit.mjs
  const payload = payloadForSigning(artifact);

  // Канонізуємо payload
  const canonicalBytesArray = canonicalBytes(payload);

  // Отримуємо ключі
  const { keyId } = derivePublicKey(secretSeed);

  // Підписуємо
  const signatureBase64 = signCanonicalBytes(canonicalBytesArray, secretSeed);

  // Формуємо envelope
  const canonicalJson = Buffer.from(canonicalBytesArray).toString('utf8');
  const envelope = {
    payload: Buffer.from(canonicalJson, 'utf8').toString('base64'),
    payloadType: 'purelambda/provenance+json',
    signatures: [{
      keyid: keyId,
      sig: signatureBase64
    }]
  };

  return envelope;
}

/**
 * Верифікує envelope зразу після створення
 */
function verifyEnvelope(envelope, secretSeed) {
  try {
    // Декодуємо payload
    const payloadContent = Buffer.from(envelope.payload, 'base64').toString('utf8');
    const provenance = JSON.parse(payloadContent);

    // Канонізуємо ТАК САМО як при створенні
    const canonicalBytesArray = canonicalBytes(provenance);

    // Отримуємо публічний ключ
    const { publicKey, keyId } = derivePublicKey(secretSeed);

    // Знаходимо наш підпис
    const ourSignature = envelope.signatures.find(sig => sig.keyid === keyId);
    if (!ourSignature) {
      return { valid: false, message: `Signature not found for keyId: ${keyId}` };
    }

    // Верифікуємо
    const isValid = verifyCanonicalBytes(canonicalBytesArray, ourSignature.sig, publicKey);

    return {
      valid: isValid,
      message: isValid ? 'Signature verified' : 'Signature verification failed',
      keyId: keyId
    };

  } catch (error) {
    return {
      valid: false,
      message: `Verification error: ${error.message}`
    };
  }
}

/**
 * Повторно підписує один артефакт
 */
function resignArtifact(artifact, secretSeed) {
  console.log(`🔏 Re-signing ${artifact.name}...`);

  try {
    // Створюємо envelope
    const envelope = createDSSEEnvelope(artifact, secretSeed);

    // Верифікуємо зразу
    const verification = verifyEnvelope(envelope, secretSeed);

    if (!verification.valid) {
      throw new Error(`Self-verification failed: ${verification.message}`);
    }

    // Записуємо envelope
    const envelopeDir = dirname(artifact.envelopePath);
    mkdirSync(envelopeDir, { recursive: true });

    writeFileSync(artifact.envelopePath, JSON.stringify(envelope, null, 2));

    const envelopeSize = Buffer.byteLength(JSON.stringify(envelope, null, 2), 'utf8');

    return {
      artifact: artifact.name,
      success: true,
      envelopePath: artifact.envelopePath,
      keyId: verification.keyId,
      size: envelopeSize,
      message: 'Signed and verified'
    };

  } catch (error) {
    return {
      artifact: artifact.name,
      success: false,
      error: error.message,
      message: `Failed: ${error.message}`
    };
  }
}

/**
 * Повторно підписує всі артефакти
 */
function resignAllArtifacts() {
  console.log('🔏 Starting Re-signing Process...\n');

  // Отримуємо секретний ключ
  let secretSeed;
  try {
    secretSeed = getEd25519Secret();
  } catch (error) {
    console.error('❌ Failed to get signing key:', error.message);
    console.error('Set PL_ED25519_SECRET environment variable with a 64-character hex string');
    process.exit(1);
  }

  // Виводимо інформацію про ключ
  const { keyId } = derivePublicKey(secretSeed);
  console.log(`🔑 Using key ID: ${keyId}`);

  // Отримуємо артефакти
  const artifacts = getAllArtifacts();

  if (artifacts.length === 0) {
    console.error('❌ No artifacts found for re-signing');
    process.exit(1);
  }

  console.log(`📋 Found ${artifacts.length} artifacts to re-sign\n`);

  const results = [];

  // Повторно підписуємо кожен артефакт
  for (const artifact of artifacts) {
    const result = resignArtifact(artifact, secretSeed);
    results.push(result);

    if (result.success) {
      console.log(`✅ ${result.artifact}: ${result.message} (${(result.size / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`❌ ${result.artifact}: ${result.message}`);
    }
  }

  // Звіт
  console.log('\n📊 Re-signing Summary');
  console.log('═'.repeat(60));

  const successful = results.filter(r => r.success).length;
  const total = results.length;
  const totalSize = results.reduce((sum, r) => sum + (r.size || 0), 0);

  console.log(`Total artifacts: ${total}`);
  console.log(`Successfully re-signed: ${successful}`);
  console.log(`Failed: ${total - successful}`);
  console.log(`Total envelope size: ${(totalSize / 1024).toFixed(1)} KB`);

  // Групування за типом
  const byType = results.reduce((acc, r) => {
    const artifact = artifacts.find(a => a.name === r.artifact);
    const type = artifact ? artifact.type : 'unknown';
    if (!acc[type]) acc[type] = { total: 0, success: 0 };
    acc[type].total++;
    if (r.success) acc[type].success++;
    return acc;
  }, {});

  console.log('\n📋 By Type:');
  Object.entries(byType).forEach(([type, stats]) => {
    console.log(`  ${type}: ${stats.success}/${stats.total} successful`);
  });

  if (successful === total) {
    console.log('\n🎉 All artifacts successfully re-signed and verified!');
    return true;
  } else {
    console.log('\n❌ Some re-signing operations failed');
    return false;
  }
}

/**
 * CLI інтерфейс
 */
function printHelp() {
  console.log('Attestation Re-signing Tool');
  console.log('');
  console.log('Re-signs all artifacts using canonical payload process:');
  console.log('  • Garden seeds (seeds/garden/*.json)');
  console.log('  • Release artifacts (dist/release/*)');
  console.log('');
  console.log('Usage:');
  console.log('  PL_ED25519_SECRET=<64-char-hex> node scripts/attest/resign.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h          Show this help message');
  console.log('');
  console.log('Environment:');
  console.log('  PL_ED25519_SECRET   Required: 64-character hex string (32 bytes)');
  console.log('');
  console.log('Examples:');
  console.log('  PL_ED25519_SECRET=abcd...ef node scripts/attest/resign.mjs');
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  try {
    const success = resignAllArtifacts();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Re-signing failed:', error.message);
    process.exit(1);
  }
}

// Запуск якщо викликано напряму
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { resignArtifact, createDSSEEnvelope, verifyEnvelope };