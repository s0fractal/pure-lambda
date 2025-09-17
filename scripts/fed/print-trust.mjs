#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Trust Score Extraction Tool
 *
 * Extracts trust score and quarantine info from federation manifest
 * Usage:
 *   node scripts/fed/print-trust.mjs dist/fed/manifest.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Print help message
 */
function printHelp() {
  console.log('Trust Score Extraction Tool');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/fed/print-trust.mjs <manifest-file>');
  console.log('  node scripts/fed/print-trust.mjs --help');
  console.log('');
  console.log('Arguments:');
  console.log('  manifest-file       Federation manifest (.json)');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h          Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/fed/print-trust.mjs dist/fed/manifest.json');
}

/**
 * Extract trust information from manifest
 */
function extractTrustInfo(manifestPath) {
  try {
    if (!fs.existsSync(manifestPath)) {
      console.error(`❌ Error: Manifest file not found: ${manifestPath}`);
      process.exit(1);
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    // Validate manifest structure
    if (!manifest.trust || typeof manifest.trust.score !== 'number') {
      console.error('❌ Error: Invalid manifest structure - missing trust.score');
      process.exit(1);
    }

    const trustScore = manifest.trust.score;
    const quarantineCount = manifest.quarantine ? manifest.quarantine.length : 0;
    const seedCount = manifest.seeds ? manifest.seeds.length : 0;
    const dsseValid = manifest.trust.stats ? manifest.trust.stats.dsseValid : 0;

    // Print trust information in parseable format
    console.log('=== Federation Trust Report ===');
    console.log(`Trust Score: ${trustScore.toFixed(3)}`);
    console.log(`Quarantine Count: ${quarantineCount}`);
    console.log(`Total Seeds: ${seedCount}`);
    console.log(`DSSE Valid: ${dsseValid}`);
    console.log('');

    // Print validation status
    const trustThreshold = 0.9;
    const trustPasses = trustScore >= trustThreshold;
    const quarantinePasses = quarantineCount === 0;

    console.log('=== Validation Status ===');
    console.log(`Trust Score ≥ ${trustThreshold}: ${trustPasses ? '✅ PASS' : '❌ FAIL'} (${trustScore.toFixed(3)})`);
    console.log(`Quarantine Count = 0: ${quarantinePasses ? '✅ PASS' : '❌ FAIL'} (${quarantineCount})`);
    console.log('');

    if (trustPasses && quarantinePasses) {
      console.log('🎉 Overall Status: ✅ READY FOR GA');
      process.exit(0);
    } else {
      console.log('⚠️  Overall Status: ❌ NOT READY');
      const failures = [];
      if (!trustPasses) failures.push(`trust score ${trustScore.toFixed(3)} < ${trustThreshold}`);
      if (!quarantinePasses) failures.push(`quarantine count ${quarantineCount} > 0`);
      console.log(`   Issues: ${failures.join(', ')}`);
      process.exit(1);
    }

  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('❌ Error: Invalid JSON in manifest file');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const manifestPath = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));

  if (!manifestPath) {
    console.error('Error: Manifest file path required');
    printHelp();
    process.exit(1);
  }

  // Resolve relative paths
  const resolvedPath = path.isAbsolute(manifestPath)
    ? manifestPath
    : path.resolve(process.cwd(), manifestPath);

  extractTrustInfo(resolvedPath);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}