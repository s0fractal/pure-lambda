#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * PL-FED-01 Federation Verification Tool
 *
 * Verifies federation bundles and manifests
 * Usage:
 *   ts-node tools/fed/verify.ts dist/release/federation.fed.zip
 *   ts-node tools/fed/verify.ts dist/fed/manifest.json
 */

import { readFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join, extname, basename } from 'path';
import { execSync } from 'child_process';
import { canonicalize } from '../../src/seed/canonical';
import { computeHash, validateSeed } from '../../src/seed/schema';
import { verifyEnvelope } from '../attest';
import { FederationManifest, FederationSeed } from './ingest';

interface VerificationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  stats: {
    seedCount: number;
    dsseValid: number;
    quarantined: number;
    trustScore: number;
  };
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
 * Extract federation bundle to temporary directory
 */
function extractBundle(bundlePath: string): string {
  const tempDir = join('/tmp', `fed-verify-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });

  try {
    const fullBundlePath = require('path').resolve(bundlePath);
    execSync(`cd "${tempDir}" && unzip -q "${fullBundlePath}"`, { stdio: 'pipe' });
    return tempDir;
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`Failed to extract bundle: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Verify checksums.txt integrity
 */
function verifyChecksums(bundleDir: string): { success: boolean; errors: string[] } {
  const errors: string[] = [];
  const checksumsPath = join(bundleDir, 'checksums.txt');

  if (!existsSync(checksumsPath)) {
    errors.push('checksums.txt not found in bundle');
    return { success: false, errors };
  }

  const checksumsContent = readFileSync(checksumsPath, 'utf8');
  const lines = checksumsContent.trim().split('\n');

  for (const line of lines) {
    const match = line.match(/^([0-9a-fA-F]{64})\s\s(.+)$/);
    if (!match) {
      errors.push(`Invalid checksum line format: ${line}`);
      continue;
    }

    const [, expectedHash, filePath] = match;
    const fullPath = join(bundleDir, filePath!);

    if (!existsSync(fullPath)) {
      errors.push(`File referenced in checksums but not found: ${filePath}`);
      continue;
    }

    const actualHash = calculateChecksum(fullPath);
    if (actualHash !== expectedHash) {
      errors.push(`Checksum mismatch for ${filePath}: expected ${expectedHash}, got ${actualHash}`);
    }
  }

  return { success: errors.length === 0, errors };
}

/**
 * Verify seed file structure and hash
 */
function verifySeedFile(seedPath: string, expectedHash: string): {
  success: boolean;
  errors: string[];
  warnings: string[];
  seedData?: any;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const seedContent = readFileSync(seedPath, 'utf8');
    const seedData = JSON.parse(seedContent);

    // Validate seed structure
    validateSeed(seedData);

    // Verify hash
    const actualHash = computeHash(canonicalize(seedData));
    if (actualHash !== expectedHash) {
      errors.push(`Seed hash mismatch: expected ${expectedHash}, got ${actualHash}`);
    }

    return { success: errors.length === 0, errors, warnings, seedData };
  } catch (error) {
    errors.push(`Seed validation failed: ${error instanceof Error ? error.message : error}`);
    return { success: false, errors, warnings };
  }
}

/**
 * Verify DSSE envelope if present
 */
function verifyDSSEFile(envelopePath: string): { success: boolean; warnings: string[] } {
  const warnings: string[] = [];

  try {
    const isValid = verifyEnvelope(envelopePath);
    if (!isValid) {
      warnings.push('DSSE signature verification failed (may require PL_ED25519_SECRET)');
    }
    return { success: isValid, warnings };
  } catch (error) {
    warnings.push(`DSSE verification error: ${error instanceof Error ? error.message : error}`);
    return { success: false, warnings };
  }
}

/**
 * Recalculate and verify trust score
 */
function verifyTrustScore(manifest: FederationManifest, seedData: Array<{ seed: FederationSeed; data: any }>): {
  success: boolean;
  errors: string[];
  calculatedScore: number;
} {
  const errors: string[] = [];

  // Filter out quarantined seeds
  const quarantinedHashes = new Set(manifest.quarantine?.map(q => q.hash) || []);
  const validSeeds = seedData.filter(s => !quarantinedHashes.has(s.seed.hash));

  if (validSeeds.length === 0) {
    const calculatedScore = 0;
    if (Math.abs(manifest.trust.score - calculatedScore) > 0.001) {
      errors.push(`Trust score mismatch: expected ${calculatedScore}, got ${manifest.trust.score}`);
    }
    return { success: errors.length === 0, errors, calculatedScore };
  }

  // Count DSSE valid seeds
  const dsseValid = validSeeds.filter(s => s.seed.dsse.valid).length;
  const conformant = validSeeds.length; // All seeds in bundle are conformant

  // Calculate ages
  const ages: number[] = [];
  for (const { data } of validSeeds) {
    try {
      const createdAt = new Date(data.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - createdAt.getTime();
      const ageInDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      ages.push(ageInDays);
    } catch {
      ages.push(365); // Default
    }
  }

  // Calculate median age
  ages.sort((a, b) => a - b);
  const ageMedian = ages.length % 2 === 0
    ? (ages[Math.floor(ages.length / 2) - 1]! + ages[Math.floor(ages.length / 2)]!) / 2
    : ages[Math.floor(ages.length / 2)]!;

  // Calculate trust score
  const dsseRatio = dsseValid / validSeeds.length;
  const conformanceRatio = conformant / validSeeds.length;
  const freshness = Math.max(0, Math.min(1, 1 - ageMedian / 365));

  const calculatedScore = 0.4 * dsseRatio + 0.4 * conformanceRatio + 0.2 * freshness;

  // Verify against manifest
  if (Math.abs(manifest.trust.score - calculatedScore) > 0.001) {
    errors.push(`Trust score mismatch: expected ${calculatedScore.toFixed(3)}, got ${manifest.trust.score}`);
  }

  if (manifest.trust.stats.dsseValid !== dsseValid) {
    errors.push(`DSSE valid count mismatch: expected ${dsseValid}, got ${manifest.trust.stats.dsseValid}`);
  }

  if (manifest.trust.stats.conformant !== conformant) {
    errors.push(`Conformant count mismatch: expected ${conformant}, got ${manifest.trust.stats.conformant}`);
  }

  const expectedAgeMedian = Math.round(ageMedian).toString();
  if (manifest.trust.stats.ageMedian !== expectedAgeMedian) {
    errors.push(`Age median mismatch: expected ${expectedAgeMedian}, got ${manifest.trust.stats.ageMedian}`);
  }

  return { success: errors.length === 0, errors, calculatedScore };
}

/**
 * Verify quarantine rules
 */
function verifyQuarantine(manifest: FederationManifest): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  // Build GID map to check for conflicts
  const gidMap = new Map<string, { hash: string; iidSet: string[] }>();
  const actualQuarantine: string[] = [];

  for (const seed of manifest.seeds) {
    let isQuarantined = false;

    for (const gid of seed.gidSet) {
      const existing = gidMap.get(gid);
      if (existing) {
        // Check if IID sets are different
        const existingIIDs = new Set(existing.iidSet);
        const currentIIDs = new Set(seed.iidSet);

        const iidsMatch = existingIIDs.size === currentIIDs.size &&
          [...existingIIDs].every(iid => currentIIDs.has(iid));

        if (!iidsMatch) {
          actualQuarantine.push(seed.hash);
          isQuarantined = true;
          break;
        }
      } else {
        gidMap.set(gid, { hash: seed.hash, iidSet: seed.iidSet });
      }
    }
  }

  // Check if quarantine list matches actual conflicts
  const manifestQuarantine = manifest.quarantine?.map(q => q.hash) || [];
  const quarantineSet = new Set(manifestQuarantine);
  const actualQuarantineSet = new Set(actualQuarantine);

  for (const hash of actualQuarantine) {
    if (!quarantineSet.has(hash)) {
      errors.push(`Seed ${hash.slice(0, 12)}... should be quarantined but is not listed`);
    }
  }

  for (const hash of manifestQuarantine) {
    if (!actualQuarantineSet.has(hash)) {
      errors.push(`Seed ${hash.slice(0, 12)}... is quarantined but no conflict detected`);
    }
  }

  return { success: errors.length === 0, errors };
}

/**
 * Verify federation bundle or manifest
 */
function verifyFederation(inputPath: string): VerificationResult {
  const result: VerificationResult = {
    success: true,
    errors: [],
    warnings: [],
    info: [],
    stats: {
      seedCount: 0,
      dsseValid: 0,
      quarantined: 0,
      trustScore: 0
    }
  };

  try {
    const extension = extname(inputPath).toLowerCase();
    const fileName = basename(inputPath);
    let bundleDir: string;
    let cleanupDir = false;

    result.info.push(`Verifying: ${fileName}`);

    if (extension === '.zip' || inputPath.endsWith('.fed.zip')) {
      result.info.push('Detected federation bundle (.fed.zip)');
      bundleDir = extractBundle(inputPath);
      cleanupDir = true;
    } else if (extension === '.json') {
      result.info.push('Detected federation manifest (.json)');
      bundleDir = join(inputPath, '..');
    } else {
      result.errors.push(`Unsupported file format: ${extension}`);
      result.success = false;
      return result;
    }

    try {
      // Read manifest
      const manifestPath = extension === '.json' ? inputPath : join(bundleDir, 'manifest.json');
      if (!existsSync(manifestPath)) {
        result.errors.push('manifest.json not found');
        result.success = false;
        return result;
      }

      const manifest: FederationManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

      // Verify manifest structure
      result.info.push('Checking manifest structure...');
      if (manifest.pl_fed !== 'PL-FED-01') {
        result.errors.push(`Invalid protocol version: ${manifest.pl_fed}`);
      }
      if (typeof manifest.version !== 'number' || manifest.version < 1) {
        result.errors.push('Invalid manifest version');
      }
      if (!manifest.createdAt || isNaN(new Date(manifest.createdAt).getTime())) {
        result.errors.push('Invalid createdAt timestamp');
      }

      // Verify checksums if bundle
      if (cleanupDir) {
        result.info.push('Verifying checksums...');
        const checksumResult = verifyChecksums(bundleDir);
        result.errors.push(...checksumResult.errors);
      }

      // Verify seeds
      result.info.push(`Verifying ${manifest.seeds.length} seed(s)...`);
      const seedData: Array<{ seed: FederationSeed; data: any }> = [];

      for (const seed of manifest.seeds) {
        const seedPath = cleanupDir
          ? join(bundleDir, 'seeds', `${seed.hash}.seed.json`)
          : join('vault/fed', `${seed.hash}.seed.json`);

        if (!existsSync(seedPath)) {
          result.warnings.push(`Seed file not found: ${seed.hash.slice(0, 12)}...`);
          continue;
        }

        const seedResult = verifySeedFile(seedPath, seed.hash);
        result.errors.push(...seedResult.errors);
        result.warnings.push(...seedResult.warnings);

        if (seedResult.success && seedResult.seedData) {
          seedData.push({ seed, data: seedResult.seedData });

          // Verify DSSE if claimed
          if (seed.dsse.present) {
            const envelopePath = cleanupDir
              ? join(bundleDir, 'dsse', `${seed.hash}.json`)
              : join('vault/fed', `${seed.hash}.envelope.json`);

            if (existsSync(envelopePath)) {
              const dsseResult = verifyDSSEFile(envelopePath);
              result.warnings.push(...dsseResult.warnings);

              if (seed.dsse.valid && !dsseResult.success) {
                result.warnings.push(`Seed ${seed.hash.slice(0, 12)}... marked as DSSE valid but verification failed`);
              } else if (!seed.dsse.valid && dsseResult.success) {
                result.warnings.push(`Seed ${seed.hash.slice(0, 12)}... marked as DSSE invalid but verification passed`);
              }
            } else {
              result.warnings.push(`DSSE envelope missing for seed: ${seed.hash.slice(0, 12)}...`);
            }
          }
        }
      }

      // Verify quarantine rules
      result.info.push('Checking quarantine rules...');
      const quarantineResult = verifyQuarantine(manifest);
      result.errors.push(...quarantineResult.errors);

      // Verify trust score calculation
      result.info.push('Verifying trust score...');
      const trustResult = verifyTrustScore(manifest, seedData);
      result.errors.push(...trustResult.errors);

      // Update stats
      result.stats.seedCount = manifest.seeds.length;
      result.stats.dsseValid = manifest.trust.stats.dsseValid;
      result.stats.quarantined = manifest.quarantine?.length || 0;
      result.stats.trustScore = trustResult.calculatedScore;

      // Final result
      result.success = result.errors.length === 0;

      if (result.success) {
        result.info.push('✅ Federation verification completed successfully');
      }

    } finally {
      // Clean up extracted bundle
      if (cleanupDir) {
        try {
          rmSync(bundleDir, { recursive: true, force: true });
        } catch (error) {
          result.warnings.push(`Failed to clean up temp directory: ${bundleDir}`);
        }
      }
    }

  } catch (error) {
    result.errors.push(`Verification failed: ${error instanceof Error ? error.message : error}`);
    result.success = false;
  }

  return result;
}

/**
 * Print verification results
 */
function printResults(result: VerificationResult) {
  console.log('\n=== PL-FED-01 Verification Results ===\n');

  // Print info messages
  if (result.info.length > 0) {
    for (const info of result.info) {
      console.log(`ℹ️  ${info}`);
    }
    console.log();
  }

  // Print stats
  console.log('📊 Statistics:');
  console.log(`   Seeds: ${result.stats.seedCount}`);
  console.log(`   DSSE Valid: ${result.stats.dsseValid}`);
  console.log(`   Quarantined: ${result.stats.quarantined}`);
  console.log(`   Trust Score: ${result.stats.trustScore.toFixed(3)}`);
  console.log();

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    for (const warning of result.warnings) {
      console.log(`   ${warning}`);
    }
    console.log();
  }

  // Print errors
  if (result.errors.length > 0) {
    console.log('❌ ERRORS:');
    for (const error of result.errors) {
      console.log(`   ${error}`);
    }
    console.log();
  }

  // Print final result
  if (result.success) {
    console.log('✅ PASS: Federation verification successful');
  } else {
    console.log('❌ FAIL: Federation verification failed');
    console.log(`   ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
  }
}

/**
 * Print help message
 */
function printHelp() {
  console.log('PL-FED-01 Federation Verification Tool');
  console.log('');
  console.log('Usage:');
  console.log('  ts-node tools/fed/verify.ts <input-file>');
  console.log('  ts-node tools/fed/verify.ts --help');
  console.log('');
  console.log('Arguments:');
  console.log('  input-file          Federation bundle (.fed.zip) or manifest (.json)');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h          Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  ts-node tools/fed/verify.ts dist/release/federation.fed.zip');
  console.log('  ts-node tools/fed/verify.ts dist/fed/manifest.json');
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

  const inputPath = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));

  if (!inputPath) {
    console.error('Error: Input file path required');
    process.exit(1);
  }

  if (!existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    const result = verifyFederation(inputPath);
    printResults(result);
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { verifyFederation };
export type { VerificationResult };