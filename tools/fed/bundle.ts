#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * PL-FED-01 Federation Bundle Tool
 *
 * Creates federation.fed.zip bundles from manifest
 * Usage:
 *   ts-node tools/fed/bundle.ts
 *   ts-node tools/fed/bundle.ts --hashes abc123,def456
 *   ts-node tools/fed/bundle.ts --output custom-federation.fed.zip
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';
import { computeHash } from '../../src/seed/schema';
import { FederationManifest } from './ingest';

interface BundleOptions {
  manifestPath?: string;
  outputPath?: string;
  selectedHashes?: string[];
  maxSizeKB?: number;
}

interface BundleResult {
  success: boolean;
  outputPath: string;
  sizeKB: number;
  seedCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * Calculate SHA-256 checksum of a file
 */
function calculateChecksum(filePath: string): string {
  const { createHash } = require('crypto');
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Create deterministic ZIP archive
 */
function createDeterministicZip(sourceDir: string, outputPath: string): void {
  // Get all files in deterministic order
  const files: Array<{ path: string; relativePath: string }> = [];

  function collectFiles(dir: string, relativePath = '') {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = join(relativePath, entry.name);

      if (entry.isFile()) {
        files.push({ path: fullPath, relativePath: relPath });
      } else if (entry.isDirectory()) {
        collectFiles(fullPath, relPath);
      }
    }
  }

  collectFiles(sourceDir);

  // Create ZIP with deterministic timestamps and compression
  const fileList = files.map(f => `"${f.relativePath}"`).join(' ');
  const command = `cd "${sourceDir}" && zip -9 -X -q "${outputPath}" ${fileList}`;

  try {
    execSync(command, { stdio: 'pipe' });
  } catch (error) {
    throw new Error(`Failed to create ZIP: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Create federation bundle
 */
function createBundle(options: BundleOptions = {}): BundleResult {
  const result: BundleResult = {
    success: true,
    outputPath: '',
    sizeKB: 0,
    seedCount: 0,
    errors: [],
    warnings: []
  };

  const manifestPath = options.manifestPath || 'dist/fed/manifest.json';
  const outputPath = options.outputPath || 'dist/release/federation.fed.zip';
  const maxSizeKB = options.maxSizeKB || 80;

  try {
    // Read manifest
    if (!existsSync(manifestPath)) {
      result.errors.push(`Manifest not found: ${manifestPath}`);
      result.success = false;
      return result;
    }

    const manifest: FederationManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

    // Filter seeds by selected hashes if specified
    let selectedSeeds = manifest.seeds;
    if (options.selectedHashes && options.selectedHashes.length > 0) {
      const hashSet = new Set(options.selectedHashes);
      selectedSeeds = manifest.seeds.filter(seed => hashSet.has(seed.hash));

      if (selectedSeeds.length === 0) {
        result.errors.push('No seeds match the selected hashes');
        result.success = false;
        return result;
      }

      console.log(`Selected ${selectedSeeds.length}/${manifest.seeds.length} seeds`);
    }

    // Create temporary bundle directory
    const tempDir = `/tmp/federation-bundle-${Date.now()}`;
    mkdirSync(tempDir, { recursive: true });
    mkdirSync(join(tempDir, 'seeds'), { recursive: true });

    try {
      // Copy manifest (with filtered seeds if applicable)
      const bundleManifest = { ...manifest, seeds: selectedSeeds };
      writeFileSync(
        join(tempDir, 'manifest.json'),
        JSON.stringify(bundleManifest, null, 2)
      );

      const checksums: string[] = [];
      let seedCount = 0;

      // Copy seed files
      for (const seed of selectedSeeds) {
        const seedPath = join('vault/fed', `${seed.hash}.seed.json`);
        if (!existsSync(seedPath)) {
          result.warnings.push(`Seed file not found in vault: ${seed.hash}`);
          continue;
        }

        const targetPath = join(tempDir, 'seeds', `${seed.hash}.seed.json`);
        const seedContent = readFileSync(seedPath, 'utf8');
        writeFileSync(targetPath, seedContent);

        // Calculate checksum
        const checksum = calculateChecksum(targetPath);
        checksums.push(`${checksum}  seeds/${seed.hash}.seed.json`);
        seedCount++;
      }

      // Copy DSSE envelopes if present
      const dsseDir = join(tempDir, 'dsse');
      let dsseCount = 0;

      for (const seed of selectedSeeds) {
        if (seed.dsse.present) {
          const envelopePath = join('vault/fed', `${seed.hash}.envelope.json`);
          if (existsSync(envelopePath)) {
            if (dsseCount === 0) {
              mkdirSync(dsseDir, { recursive: true });
            }

            const targetPath = join(dsseDir, `${seed.hash}.json`);
            const envelopeContent = readFileSync(envelopePath, 'utf8');
            writeFileSync(targetPath, envelopeContent);

            // Calculate checksum
            const checksum = calculateChecksum(targetPath);
            checksums.push(`${checksum}  dsse/${seed.hash}.json`);
            dsseCount++;
          }
        }
      }

      // Add manifest checksum
      const manifestChecksum = calculateChecksum(join(tempDir, 'manifest.json'));
      checksums.unshift(`${manifestChecksum}  manifest.json`);

      // Write checksums file
      writeFileSync(join(tempDir, 'checksums.txt'), checksums.join('\n') + '\n');

      // Add checksums checksum
      const checksumsChecksum = calculateChecksum(join(tempDir, 'checksums.txt'));
      console.log(`Bundle integrity: ${checksumsChecksum.slice(0, 12)}...`);

      // Ensure output directory exists
      const fullOutputPath = require('path').resolve(outputPath);
      mkdirSync(join(fullOutputPath, '..'), { recursive: true });

      // Create ZIP bundle
      createDeterministicZip(tempDir, fullOutputPath);

      // Check size
      const stats = statSync(fullOutputPath);
      const sizeKB = Math.round(stats.size / 1024 * 100) / 100;

      result.outputPath = fullOutputPath;
      result.sizeKB = sizeKB;
      result.seedCount = seedCount;

      if (sizeKB > maxSizeKB) {
        result.warnings.push(
          `Bundle size (${sizeKB} KB) exceeds limit (${maxSizeKB} KB)`
        );
      }

      console.log(`\n=== Federation Bundle Created ===`);
      console.log(`Output: ${basename(outputPath)}`);
      console.log(`Size: ${sizeKB} KB`);
      console.log(`Seeds: ${seedCount}`);
      console.log(`DSSE: ${dsseCount}`);
      console.log(`Trust Score: ${bundleManifest.trust.score.toFixed(3)}`);

    } finally {
      // Clean up temp directory
      try {
        execSync(`rm -rf "${tempDir}"`, { stdio: 'pipe' });
      } catch (error) {
        result.warnings.push(`Failed to clean up temp directory: ${tempDir}`);
      }
    }

  } catch (error) {
    result.errors.push(`Bundle creation failed: ${error instanceof Error ? error.message : error}`);
    result.success = false;
  }

  return result;
}

/**
 * Parse comma-separated hash list
 */
function parseHashList(hashStr: string): string[] {
  return hashStr
    .split(',')
    .map(h => h.trim())
    .filter(h => h.length > 0);
}

/**
 * Print help message
 */
function printHelp() {
  console.log('PL-FED-01 Federation Bundle Tool');
  console.log('');
  console.log('Usage:');
  console.log('  ts-node tools/fed/bundle.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  --manifest <path>      Manifest file path (default: dist/fed/manifest.json)');
  console.log('  --output <path>        Output bundle path (default: dist/release/federation.fed.zip)');
  console.log('  --hashes <list>        Comma-separated list of seed hashes to include');
  console.log('  --max-size <kb>        Maximum bundle size in KB (default: 80)');
  console.log('  --help, -h             Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  ts-node tools/fed/bundle.ts');
  console.log('  ts-node tools/fed/bundle.ts --output custom.fed.zip');
  console.log('  ts-node tools/fed/bundle.ts --hashes abc123,def456');
  console.log('  ts-node tools/fed/bundle.ts --max-size 40');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const options: BundleOptions = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--manifest' && i + 1 < args.length) {
      const value = args[++i];
      if (value) options.manifestPath = value;
    } else if (arg === '--output' && i + 1 < args.length) {
      const value = args[++i];
      if (value) options.outputPath = value;
    } else if (arg === '--hashes' && i + 1 < args.length) {
      const value = args[++i];
      if (value) options.selectedHashes = parseHashList(value);
    } else if (arg === '--max-size' && i + 1 < args.length) {
      const value = args[++i];
      if (value) {
        options.maxSizeKB = parseInt(value, 10);
        if (isNaN(options.maxSizeKB) || options.maxSizeKB <= 0) {
          console.error('Error: Invalid max-size value');
          process.exit(1);
        }
      }
    } else if (arg?.startsWith('--')) {
      console.error(`Error: Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  try {
    const result = createBundle(options);

    if (result.errors.length > 0) {
      console.error('\nErrors:');
      for (const error of result.errors) {
        console.error(`  ❌ ${error}`);
      }
    }

    if (result.warnings.length > 0) {
      console.warn('\nWarnings:');
      for (const warning of result.warnings) {
        console.warn(`  ⚠️  ${warning}`);
      }
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Bundle creation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { createBundle };
export type { BundleOptions, BundleResult };