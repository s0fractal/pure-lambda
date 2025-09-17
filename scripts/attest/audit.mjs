#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Attestation Audit Script
 *
 * Пробігає всі 11 артефактів і порівнює:
 * - buildBytes = canonicalBytes(payloadForSigning(artifact))
 * - verifyBytes = байти які бере verify-скрипт
 *
 * Виявляє несумісності та класифікує їх за типами:
 * - CANON_DRIFT: різниця у канонізації
 * - KEY_MISMATCH: неспівпадіння ключів
 * - ENVELOPE_SCHEMA: проблеми зі структурою DSSE
 * - DOUBLE_BASE64: подвійне кодування base64
 * - EXTRA_NEWLINE: зайві символи нового рядка
 */

import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { canonicalBytes } from './canonical-bytes.mjs';
import { canonicalize, toBytes } from './canonical-json.mjs';

/**
 * Знаходить усі 11 артефактів для аудиту
 */
function getAllArtifacts() {
  const artifacts = [];

  // Garden seeds (9 штук)
  const gardenSeeds = [
    'bounded-delay', 'branch-stress', 'focus-delay', 'hello-city',
    'loop-lite', 'partition-merge', 'route-merge', 'scan-focus', 'select'
  ];

  for (const seedName of gardenSeeds) {
    const envelopePath = `dsse/garden/${seedName}.envelope.json`;
    if (existsSync(envelopePath)) {
      artifacts.push({
        name: seedName,
        type: 'garden-seed',
        envelopePath,
        seedPath: `seeds/garden/${seedName}.json`
      });
    }
  }

  // Release artifacts (2 штуки)
  const releaseArtifacts = [
    { name: 'hello-city.cartridge', envelopePath: 'dsse/release/hello-city.cartridge.envelope.json' },
    { name: 'hello-city.htmlc', envelopePath: 'dsse/release/hello-city.htmlc.envelope.json' }
  ];

  for (const artifact of releaseArtifacts) {
    if (existsSync(artifact.envelopePath)) {
      artifacts.push({
        name: artifact.name,
        type: 'release-artifact',
        envelopePath: artifact.envelopePath
      });
    }
  }

  return artifacts;
}

/**
 * Формує payload для підписування (відповідно до build логіки)
 * Це має бути ТОЧНО той самий алгоритм що у build.mjs
 */
function payloadForSigning(artifact) {
  if (artifact.type === 'garden-seed') {
    // Для garden seeds читаємо JSON файл та формуємо атестацію
    if (!existsSync(artifact.seedPath)) {
      throw new Error(`Seed file not found: ${artifact.seedPath}`);
    }

    const seedContent = readFileSync(artifact.seedPath, 'utf8');
    const seedData = JSON.parse(seedContent);

    // Аналізуємо seed для формування attestation structure
    const nodeCount = Object.keys(seedData.nodes || {}).filter(key =>
      seedData.nodes[key].op && seedData.nodes[key].op !== 'ROOT'
    ).length;

    const pattern = seedData.expected?.invariants?.[2] || 'unknown';

    // Формуємо payload відповідно до all-artifacts.mjs логіки
    const payload = {
      name: artifact.name,
      path: `/Users/chaoshex/Projects/pure-lambda/${artifact.seedPath}`,
      type: artifact.type,
      timestamp: new Date().toISOString(), // Note: це буде інше у audit vs build
      version: "1.0.0",
      gitRev: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),

      seed: {
        path: artifact.seedPath,
        hash: createHash('sha256').update(seedContent).digest('hex'),
        size: Buffer.byteLength(seedContent, 'utf8'),
        nodeCount,
        pattern
      },

      validation: {
        gidStable: seedData.gidSet && seedData.gidSet.length > 0,
        iidStable: seedData.iidSet && seedData.iidSet.length > 0,
        minRouteLen: seedData.expected?.minRouteLen || 0,
        structureValid: true
      },

      tools: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    return payload;

  } else if (artifact.type === 'release-artifact') {
    // Для release artifacts формуємо відповідний payload
    const artifactPath = `dist/release/${artifact.name}`;
    let artifactContent = null;
    let artifactHash = null;
    let artifactSize = null;
    let exists = false;

    if (existsSync(artifactPath)) {
      exists = true;
      try {
        artifactContent = readFileSync(artifactPath);
        artifactHash = createHash('sha256').update(artifactContent).digest('hex');
        artifactSize = artifactContent.length;
      } catch (error) {
        // File exists but can't read it
        exists = false;
      }
    }

    const payload = {
      name: artifact.name,
      path: `/Users/chaoshex/Projects/pure-lambda/${artifactPath}`,
      type: artifact.type,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      gitRev: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),

      artifact: {
        path: artifactPath,
        hash: artifactHash,
        size: artifactSize,
        algorithm: 'sha256'
      },

      validation: {
        exists,
        readable: exists,
        sizeValid: exists && artifactSize > 0,
        typeValid: exists
      },

      tools: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },

      metadata: {}
    };

    return payload;
  }

  throw new Error(`Unknown artifact type: ${artifact.type}`);
}

/**
 * Отримує verify bytes з envelope (те що verify-скрипт бачить)
 */
function getVerifyBytes(envelopePath) {
  if (!existsSync(envelopePath)) {
    throw new Error(`Envelope not found: ${envelopePath}`);
  }

  const envelopeContent = readFileSync(envelopePath, 'utf8');
  const envelope = JSON.parse(envelopeContent);

  // Декодуємо payload з base64 (перевіряємо обидва формати)
  const payloadBase64 = envelope.payload || envelope.payloadBase64;
  if (!payloadBase64) {
    throw new Error(`No payload found in envelope (checked 'payload' and 'payloadBase64' fields)`);
  }

  const payloadContent = Buffer.from(payloadBase64, 'base64').toString('utf8');
  const provenance = JSON.parse(payloadContent);

  // Канонізуємо так само як verify-скрипт
  const canonicalPayload = canonicalize(provenance);
  return toBytes(canonicalPayload);
}

/**
 * Класифікує тип проблеми порівнюючи build vs verify bytes
 */
function classifyMismatch(buildBytes, verifyBytes, artifact) {
  const buildHex = Buffer.from(buildBytes).toString('hex');
  const verifyHex = Buffer.from(verifyBytes).toString('hex');
  const buildHash = createHash('sha256').update(buildBytes).digest('hex');
  const verifyHash = createHash('sha256').update(verifyBytes).digest('hex');

  const issues = [];

  // Перевіряємо довжину
  if (buildBytes.length !== verifyBytes.length) {
    issues.push('LENGTH_MISMATCH');
  }

  // Перевіряємо наявність зайвих \n
  const buildStr = Buffer.from(buildBytes).toString('utf8');
  const verifyStr = Buffer.from(verifyBytes).toString('utf8');

  if (buildStr.endsWith('\n') || verifyStr.endsWith('\n')) {
    issues.push('EXTRA_NEWLINE');
  }

  // Перевіряємо подвійне base64 кодування
  try {
    const decoded = Buffer.from(verifyStr, 'base64').toString('utf8');
    if (decoded !== verifyStr && JSON.parse(decoded)) {
      issues.push('DOUBLE_BASE64');
    }
  } catch (e) {
    // Not base64 encoded - normal
  }

  // Перевіряємо структурні відмінності
  try {
    const buildObj = JSON.parse(buildStr);
    const verifyObj = JSON.parse(verifyStr);

    // Порівнюємо ключі верхнього рівня
    const buildKeys = Object.keys(buildObj).sort();
    const verifyKeys = Object.keys(verifyObj).sort();

    if (JSON.stringify(buildKeys) !== JSON.stringify(verifyKeys)) {
      issues.push('ENVELOPE_SCHEMA');
    }

    // Перевіряємо канонізацію
    const buildCanon = canonicalBytes(buildObj);
    const verifyCanon = canonicalBytes(verifyObj);

    if (Buffer.from(buildCanon).toString('hex') !== Buffer.from(verifyCanon).toString('hex')) {
      issues.push('CANON_DRIFT');
    }

  } catch (e) {
    issues.push('JSON_PARSE_ERROR');
  }

  // За замовчуванням - загальний тип проблеми
  if (issues.length === 0) {
    issues.push('UNKNOWN_MISMATCH');
  }

  return {
    issues,
    buildHash: buildHash.slice(0, 16),
    verifyHash: verifyHash.slice(0, 16),
    sizeDiff: buildBytes.length - verifyBytes.length
  };
}

/**
 * Виконує аудит одного артефакту
 */
function auditArtifact(artifact) {
  console.log(`🔍 Auditing ${artifact.name}...`);

  try {
    // Формуємо build bytes
    const payload = payloadForSigning(artifact);
    const buildBytes = canonicalBytes(payload);

    // Отримуємо verify bytes
    const verifyBytes = getVerifyBytes(artifact.envelopePath);

    // Порівнюємо хеші
    const buildHash = createHash('sha256').update(buildBytes).digest('hex');
    const verifyHash = createHash('sha256').update(verifyBytes).digest('hex');

    const match = buildHash === verifyHash;

    if (match) {
      return {
        artifact: artifact.name,
        status: 'MATCH',
        buildHash: buildHash.slice(0, 16),
        verifyHash: verifyHash.slice(0, 16),
        issues: []
      };
    } else {
      const classification = classifyMismatch(buildBytes, verifyBytes, artifact);
      return {
        artifact: artifact.name,
        status: 'MISMATCH',
        buildHash: classification.buildHash,
        verifyHash: classification.verifyHash,
        issues: classification.issues,
        sizeDiff: classification.sizeDiff
      };
    }

  } catch (error) {
    console.error(`Debug error for ${artifact.name}:`, error.message);
    console.error('Stack:', error.stack);
    return {
      artifact: artifact.name,
      status: 'ERROR',
      error: error.message,
      issues: ['PROCESSING_ERROR']
    };
  }
}

/**
 * Виводить звіт у табличному вигляді
 */
function printReport(results) {
  console.log('\n📊 Attestation Audit Report');
  console.log('═'.repeat(80));

  // Таблиця результатів
  console.log('Artifact'.padEnd(25) + 'Status'.padEnd(12) + 'Issues'.padEnd(30) + 'Hashes');
  console.log('─'.repeat(80));

  for (const result of results) {
    const name = result.artifact.padEnd(25);
    const status = result.status.padEnd(12);
    const issues = (result.issues || []).join(', ').padEnd(30);
    const hashes = result.buildHash && result.verifyHash
      ? `${result.buildHash}...${result.verifyHash}`
      : (result.error || 'N/A');

    console.log(name + status + issues + hashes);
  }

  console.log('─'.repeat(80));

  // Статистика
  const total = results.length;
  const matches = results.filter(r => r.status === 'MATCH').length;
  const mismatches = results.filter(r => r.status === 'MISMATCH').length;
  const errors = results.filter(r => r.status === 'ERROR').length;

  console.log(`Total artifacts: ${total}`);
  console.log(`Matches: ${matches} (${(matches/total*100).toFixed(1)}%)`);
  console.log(`Mismatches: ${mismatches} (${(mismatches/total*100).toFixed(1)}%)`);
  console.log(`Errors: ${errors} (${(errors/total*100).toFixed(1)}%)`);

  // Аналіз проблем
  if (mismatches > 0 || errors > 0) {
    console.log('\n🔍 Issue Analysis:');
    const issueCount = {};

    for (const result of results) {
      if (result.issues) {
        for (const issue of result.issues) {
          issueCount[issue] = (issueCount[issue] || 0) + 1;
        }
      }
    }

    Object.entries(issueCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([issue, count]) => {
        console.log(`  ${issue}: ${count} artifact(s)`);
      });
  }

  console.log('═'.repeat(80));

  return {
    total,
    matches,
    mismatches,
    errors,
    success: mismatches === 0 && errors === 0
  };
}

/**
 * Головна функція
 */
function main() {
  console.log('🔍 Starting Attestation Audit...\n');

  const artifacts = getAllArtifacts();

  if (artifacts.length === 0) {
    console.error('❌ No artifacts found for audit');
    process.exit(1);
  }

  console.log(`Found ${artifacts.length} artifacts to audit`);

  const results = [];

  for (const artifact of artifacts) {
    const result = auditArtifact(artifact);
    results.push(result);
  }

  const summary = printReport(results);

  if (summary.success) {
    console.log('✅ All artifacts passed audit!');
    process.exit(0);
  } else {
    console.log('❌ Audit detected issues');
    process.exit(1);
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { auditArtifact, getAllArtifacts, payloadForSigning };