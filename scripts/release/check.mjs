#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors


/**
 * Release Validation Script
 * Validates dist/release/manifest.json keys and checksums.txt integrity
 * Exits non-zero on validation failure
 */

import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

const RELEASE_DIR = 'dist/release';
const MANIFEST_PATH = join(RELEASE_DIR, 'manifest.json');
const CHECKSUMS_PATH = join(RELEASE_DIR, 'checksums.txt');

// Required manifest keys
const REQUIRED_KEYS = [
  'ts',
  'gitRev',
  'pkgVersion',
  'node',
  'tools',
  'sizes',
  'hashes',
  'limits'
];

/**
 * Compute SHA256 hash of a file
 */
function computeFileHash(filePath) {
  try {
    const content = readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Parse checksums.txt and extract hash expectations
 */
function parseChecksumFile(content) {
  const checksums = {};
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.trim().startsWith('#') || !line.trim()) continue;

    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const hash = parts[0];
      const fileName = parts[1];

      // Skip (SHA256) annotations
      if (!fileName.includes('(SHA256)')) {
        checksums[fileName] = hash;
      }
    }
  }

  return checksums;
}

/**
 * Validate manifest.json structure
 */
function validateManifest(manifestPath) {
  console.log('🔍 Validating manifest.json structure...');

  if (!existsSync(manifestPath)) {
    console.error(`❌ Manifest file not found: ${manifestPath}`);
    return false;
  }

  let manifest;
  try {
    const content = readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(content);
  } catch (error) {
    console.error(`❌ Invalid JSON in manifest: ${error.message}`);
    return false;
  }

  // Check required keys
  const missingKeys = REQUIRED_KEYS.filter(key => !(key in manifest));
  if (missingKeys.length > 0) {
    console.error(`❌ Missing required keys in manifest: ${missingKeys.join(', ')}`);
    return false;
  }

  // Check for hashes sub-structure
  if (!manifest.hashes || typeof manifest.hashes !== 'object') {
    console.error('❌ Manifest missing hashes object');
    return false;
  }

  if (!manifest.hashes.blake3 && !manifest.hashes.sha256) {
    console.error('❌ Manifest missing hash algorithms (blake3 or sha256)');
    return false;
  }

  console.log(`✅ Manifest structure valid (${Object.keys(manifest).length} top-level keys)`);
  return true;
}

/**
 * Validate checksums.txt against actual files
 */
function validateChecksums(checksumsPath) {
  console.log('🔍 Validating checksums.txt against actual files...');

  if (!existsSync(checksumsPath)) {
    console.error(`❌ Checksums file not found: ${checksumsPath}`);
    return false;
  }

  let checksumsContent;
  try {
    checksumsContent = readFileSync(checksumsPath, 'utf8');
  } catch (error) {
    console.error(`❌ Error reading checksums file: ${error.message}`);
    return false;
  }

  const expectedHashes = parseChecksumFile(checksumsContent);
  let validationCount = 0;
  let failureCount = 0;

  for (const [fileName, expectedHash] of Object.entries(expectedHashes)) {
    const filePath = join(RELEASE_DIR, fileName);

    if (!existsSync(filePath)) {
      console.error(`❌ File listed in checksums but not found: ${fileName}`);
      failureCount++;
      continue;
    }

    const actualHash = computeFileHash(filePath);
    if (actualHash === null) {
      failureCount++;
      continue;
    }

    if (actualHash === expectedHash) {
      console.log(`✅ ${fileName}: checksum valid`);
      validationCount++;
    } else {
      console.error(`❌ ${fileName}: checksum mismatch`);
      console.error(`   Expected: ${expectedHash}`);
      console.error(`   Actual:   ${actualHash}`);
      failureCount++;
    }
  }

  if (failureCount > 0) {
    console.error(`❌ ${failureCount} checksum validation(s) failed`);
    return false;
  }

  console.log(`✅ All ${validationCount} checksums valid`);
  return true;
}

/**
 * Validate presence of required files in stage directory
 */
function validateRequiredFiles(stageDir) {
  console.log('📋 Validating required files...');

  const requiredFiles = [
    'reports/conformance/summary.md',
    'licenses/NOTICE.txt'
  ];

  const optionalFiles = [
    'tests/junit.xml'
  ];

  let allRequired = true;

  // Check required files
  for (const file of requiredFiles) {
    const filePath = join(stageDir, file);
    if (existsSync(filePath)) {
      console.log(`   ✅ Found: ${file}`);
    } else {
      console.log(`   ❌ Missing required: ${file}`);
      allRequired = false;
    }
  }

  // Check optional files (warnings only)
  for (const file of optionalFiles) {
    const filePath = join(stageDir, file);
    if (existsSync(filePath)) {
      console.log(`   ✅ Found: ${file}`);
    } else {
      console.log(`   ⚠️  Optional file missing: ${file}`);
    }
  }

  return allRequired;
}

/**
 * Main validation routine
 */
function main() {
  console.log('🚀 Starting release validation...\n');

  const manifestValid = validateManifest(MANIFEST_PATH);
  const checksumsValid = validateChecksums(CHECKSUMS_PATH);
  const stageDir = join(RELEASE_DIR, 'stage');
  const filesValid = validateRequiredFiles(stageDir);

  console.log('\n📊 Validation Summary:');
  console.log(`   Manifest: ${manifestValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Checksums: ${checksumsValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Required Files: ${filesValid ? '✅ PASS' : '❌ FAIL'}`);

  if (manifestValid && checksumsValid && filesValid) {
    console.log('\n🎉 Release validation: ALL CHECKS PASSED');
    process.exit(0);
  } else {
    console.log('\n💥 Release validation: FAILED');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}