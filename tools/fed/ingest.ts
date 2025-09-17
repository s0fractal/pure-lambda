#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Federation Ingest Tool
 *
 * Ingests seeds into federation vault with format normalization
 * Usage:
 *   ts-node tools/fed/ingest.ts seeds/garden
 *   ts-node tools/fed/ingest.ts --format=operon seeds/garden
 */

const { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } = require('fs');
const { join, basename, extname } = require('path');
const { execSync } = require('child_process');
const { normalizeSeed } = require('../seed/normalize');
const { validateSeed } = require('../../src/seed/schema');
const { canonicalize } = require('../../src/seed/canonical');
const crypto = require('crypto');
const { computeXIDv2, canonicalBytes } = require('./compute-xidv2');

interface IngestOptions {
  format: 'auto' | 'tiles' | 'operon';
  vaultDir: string;
  manifestPath: string;
  indexPath: string;
  diagnosticsDir: string;
  verbose: boolean;
}

interface SeedEntry {
  name: string;
  hash: string;
  gidSet: string[];
  iidSet: string[];
  xidSet: string[];
  xidV1?: string;
  xidV2?: string;
  canonicalHash?: string;
  dsse: {
    present: boolean;
    valid: boolean;
  };
  source: {
    kind: string;
    file: string;
    format: string;
    normalized: boolean;
  };
}

interface GidIndexEntry {
  file: string;
  aliases: string[];
  canonicalJson: string;
  hash: string;
  xidV1?: string;
  xidV2?: string;
}

interface GidIndex {
  [gid: string]: GidIndexEntry;
}

export interface FederationManifest {
  pl_fed: 'PL-FED-01';
  version: number;
  createdAt: string;
  seeds: SeedEntry[];
  trust: {
    score: number;
    stats: {
      dsseValid: number;
      conformant: number;
      ageMedian: string;
    };
  };
  quarantine: Array<{
    hash: string;
    reason: 'GID_CONFLICT' | 'GID_CANON_BUG' | 'VALIDATION_ERROR' | string;
    details: string;
    gid?: string;
    diffFile?: string;
  }>;
}

/**
 * Compute SHA-256 hash of canonical JSON
 */
function computeHash(data: any): string {
  const { createHash } = require('crypto');
  const canonical = canonicalize(data);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Load or create GID index
 */
function loadGidIndex(indexPath: string): GidIndex {
  if (existsSync(indexPath)) {
    try {
      return JSON.parse(readFileSync(indexPath, 'utf8'));
    } catch (error) {
      console.error(`⚠ Could not read GID index: ${error}`);
    }
  }
  return {};
}

/**
 * Save GID index
 */
function saveGidIndex(index: GidIndex, indexPath: string): void {
  const indexDir = join(indexPath, '..');
  if (!existsSync(indexDir)) {
    mkdirSync(indexDir, { recursive: true });
  }
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Check for GID conflicts and update index
 */
function processGidConflicts(
  seedEntries: SeedEntry[],
  gidIndex: GidIndex,
  options: IngestOptions
): Array<{ hash: string; reason: string; details: string; gid?: string; diffFile?: string }> {
  const quarantine: Array<{ hash: string; reason: string; details: string; gid?: string; diffFile?: string }> = [];

  for (const seed of seedEntries) {
    for (const gid of seed.gidSet) {
      if (!gid) continue;

      if (gidIndex[gid]) {
        const existing = gidIndex[gid];

        // Load the canonical forms to compare
        let currentCanonical: string;
        let existingCanonical: string;

        try {
          // Get current seed's canonical JSON
          const vaultFile = join(options.vaultDir, `${seed.hash}.seed.json`);
          const currentSeed = JSON.parse(readFileSync(vaultFile, 'utf8'));
          currentCanonical = canonicalize(currentSeed);
          existingCanonical = existing.canonicalJson;

          if (currentCanonical === existingCanonical) {
            // Same canonical form - merge as alias
            if (!existing.aliases.includes(seed.name)) {
              existing.aliases.push(seed.name);
            }
            if (options.verbose) {
              console.error(`✓ GID ${gid} - merging ${seed.name} as alias (identical canonical)`);
            }
          } else {
            // Different canonical forms - check if it's a family member or conflict
            // Family members share GID but have different IID/XID
            const gidIndex = seed.gidSet.indexOf(gid);
            const currentIID = seed.iidSet?.[gidIndex];
            const currentXID = seed.xidSet?.[gidIndex];

            // Get existing seed's IID/XID for this GID
            const existingSeedFile = join(options.vaultDir, existing.file);
            const existingSeed = JSON.parse(readFileSync(existingSeedFile, 'utf8'));
            const existingGidIndex = existingSeed.meta?.gidSet?.indexOf(gid) ?? -1;
            const existingIID = existingSeed.meta?.iidSet?.[existingGidIndex];
            const existingXID = existingSeed.meta?.xidSet?.[existingGidIndex];

            // Compute XIDv2 for both seeds
            const currentXIDv2 = computeXIDv2(currentSeed);
            const existingXIDv2 = computeXIDv2(existingSeed);

            // Use XIDv2 as primary key, fallback to XIDv1
            const currentKey = seed.xidV2 || currentXIDv2 || currentXID;
            const existingKey = existing.xidV2 || existingXIDv2 || existingXID;

            // Check if keys match (potential conflict)
            if (currentKey === existingKey && currentKey !== undefined) {
              // Same XID but different canonical - this is a real conflict
              const diffFile = join(options.diagnosticsDir, `gid-conflict-${gid}.diff.json`);

              if (!existsSync(options.diagnosticsDir)) {
                mkdirSync(options.diagnosticsDir, { recursive: true });
              }

              const diffData = {
                gid,
                conflict: 'KEY_CANON_MISMATCH',
                existing: {
                  file: existing.file,
                  aliases: existing.aliases,
                  hash: existing.hash,
                  xid: existingXID,
                  canonicalJson: existingCanonical
                },
                current: {
                  file: `${seed.hash}.seed.json`,
                  name: seed.name,
                  hash: seed.hash,
                  xid: currentXID,
                  canonicalJson: currentCanonical
                },
                timestamp: new Date().toISOString()
              };

              writeFileSync(diffFile, JSON.stringify(diffData, null, 2));

              quarantine.push({
                hash: seed.hash,
                reason: 'XID_CANON_MISMATCH',
                details: `XID ${currentXID} has different canonical form for GID ${gid}`,
                gid,
                diffFile
              });

              if (options.verbose) {
                console.error(`❌ XID conflict for GID ${gid} - quarantined (see ${diffFile})`);
              }
            } else {
              // Different IID/XID - this is a GID family member, not a conflict
              // Just note it but don't quarantine
              if (options.verbose) {
                console.log(`✓ GID ${gid} family - ${seed.name} has different IID/XID (not a conflict)`);
              }
            }
          }
        } catch (error) {
          console.error(`⚠ Error processing GID ${gid}: ${error}`);
          quarantine.push({
            hash: seed.hash,
            reason: 'VALIDATION_ERROR',
            details: `Could not compare canonical forms for GID ${gid}: ${error}`
          });
        }
      } else {
        // New GID - add to index
        const vaultFile = `${seed.hash}.seed.json`;
        try {
          const seedFile = join(options.vaultDir, vaultFile);
          const seedData = JSON.parse(readFileSync(seedFile, 'utf8'));
          const canonical = canonicalize(seedData);

          gidIndex[gid] = {
            file: vaultFile,
            aliases: [seed.name],
            canonicalJson: canonical,
            hash: seed.hash
          };

          if (options.verbose) {
            console.error(`✓ GID ${gid} - new entry for ${seed.name}`);
          }
        } catch (error) {
          console.error(`⚠ Error adding GID ${gid} to index: ${error}`);
        }
      }
    }
  }

  return quarantine;
}

/**
 * Calculate trust score
 */
function calculateTrustScore(seedEntries: SeedEntry[], quarantine: any[]): number {
  const dsseValid = seedEntries.filter(s => s.dsse.valid).length;
  const conformant = seedEntries.filter(s => quarantine.find(q => q.hash === s.hash) === undefined).length;
  const ageScore = 1.0; // All seeds are fresh for now

  // Trust formula: 40% conformity + 20% DSSE + 40% age
  return 0.4 * (conformant / seedEntries.length) + 0.2 * (dsseValid / seedEntries.length) + 0.4 * ageScore;
}

/**
 * Check if DSSE envelope exists and is valid for a seed
 */
function checkDSSE(seedName: string): { present: boolean; valid: boolean } {
  try {
    // Check for envelope file in dsse/garden directory
    const envelopePath = `dsse/garden/${seedName}.envelope.json`;

    if (!existsSync(envelopePath)) {
      return { present: false, valid: false };
    }

    // Verify the envelope using the verify script
    try {
      const result = execSync(
        `export PL_ED25519_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef12345678901234567890ab && node scripts/attest/verify.mjs ${envelopePath}`,
        { encoding: 'utf8', stdio: 'pipe' }
      );

      // If verification succeeded, both present and valid are true
      return { present: true, valid: true };
    } catch (verifyError) {
      // Envelope exists but verification failed
      return { present: true, valid: false };
    }
  } catch (error) {
    return { present: false, valid: false };
  }
}

/**
 * Process a single seed file
 */
async function processSeedFile(filePath: string, options: IngestOptions): Promise<SeedEntry | null> {
  try {
    const content = readFileSync(filePath, 'utf8');
    const inputData = JSON.parse(content);

    // Detect format if auto
    let detectedFormat = options.format;
    if (options.format === 'auto') {
      // Use our normalizer's format detection
      const normalizeResult = await normalizeSeed(inputData);
      detectedFormat = normalizeResult.format as 'tiles' | 'operon';
    }

    // Normalize the seed
    const normalizeResult = await normalizeSeed(inputData);
    const { seedTiles, gidSet, iidSet, xidSet, format, canonicalJson } = normalizeResult;

    // Validate the normalized seed
    validateSeed(seedTiles);

    // Compute hash of canonical seed
    const hash = computeHash(seedTiles);

    // Store in vault
    const vaultFile = join(options.vaultDir, `${hash}.seed.json`);
    writeFileSync(vaultFile, JSON.stringify(seedTiles, null, 2));

    if (options.verbose) {
      console.error(`✓ Processed ${basename(filePath)} → ${hash}.seed.json (${format} format)`);
    }

    // Get seed name
    const seedName = (seedTiles as any).name || basename(filePath, extname(filePath));

    // Check DSSE status
    const dsseStatus = checkDSSE(seedName);

    // Compute XIDv2 for the seed
    const xidV2 = computeXIDv2(seedTiles);
    const xidV1 = xidSet?.[0] || null;

    // Compute canonical hash
    const canonicalHash = crypto.createHash('sha256')
      .update(canonicalBytes(seedTiles))
      .digest('hex');

    // Create seed entry
    const seedEntry: SeedEntry = {
      name: seedName,
      hash,
      gidSet,
      iidSet,
      xidSet,
      xidV1,
      xidV2,
      canonicalHash,
      dsse: dsseStatus,
      source: {
        kind: 'seed',
        file: filePath,
        format: format,
        normalized: format !== 'tiles' || JSON.stringify(inputData) !== JSON.stringify(seedTiles)
      }
    };

    return seedEntry;

  } catch (error) {
    console.error(`❌ Failed to process ${filePath}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/**
 * Process a directory of seed files
 */
async function processDirectory(dirPath: string, options: IngestOptions): Promise<SeedEntry[]> {
  const seedEntries: SeedEntry[] = [];

  if (!existsSync(dirPath)) {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }

  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isFile() && entry.endsWith('.json')) {
      const seedEntry = await processSeedFile(fullPath, options);
      if (seedEntry) {
        seedEntries.push(seedEntry);
      }
    } else if (stat.isDirectory() && options.verbose) {
      console.error(`⚠ Skipping directory: ${entry}`);
    }
  }

  return seedEntries;
}

/**
 * Update or create federation manifest
 */
function updateManifest(seedEntries: SeedEntry[], options: IngestOptions): void {
  // Load existing manifest if it exists
  let existingSeeds: SeedEntry[] = [];
  if (existsSync(options.manifestPath)) {
    try {
      const existingManifest = JSON.parse(readFileSync(options.manifestPath, 'utf8'));
      existingSeeds = existingManifest.seeds || [];
    } catch (error) {
      console.error(`⚠ Could not read existing manifest: ${error}`);
    }
  }

  // Merge seeds (replace duplicates by hash)
  const allSeeds = [...existingSeeds];
  const existingHashes = new Set(existingSeeds.map(s => s.hash));

  for (const newSeed of seedEntries) {
    if (!existingHashes.has(newSeed.hash)) {
      allSeeds.push(newSeed);
    } else {
      // Replace existing seed with same hash
      const index = allSeeds.findIndex(s => s.hash === newSeed.hash);
      if (index >= 0) {
        allSeeds[index] = newSeed;
      }
    }
  }

  // Load GID index and process conflicts
  const gidIndex = loadGidIndex(options.indexPath);
  const quarantine = processGidConflicts(allSeeds, gidIndex, options);

  // Save updated GID index
  saveGidIndex(gidIndex, options.indexPath);

  // Calculate trust score
  const trustScore = calculateTrustScore(allSeeds, quarantine);

  // Build families index
  const families: Record<string, { gid: string; members: any[] }> = {};
  for (const seed of allSeeds) {
    for (const gid of seed.gidSet || []) {
      if (!families[gid]) {
        families[gid] = { gid, members: [] };
      }
      families[gid].members.push({
        name: seed.name,
        hash: seed.hash,
        xidV1: seed.xidV1,
        xidV2: seed.xidV2,
        file: seed.source.file
      });
    }
  }

  // Create manifest v2
  const manifest: any = {
    schema: 'PL-FED-MANIFEST-2',
    pl_fed: 'PL-FED-01',
    version: 2,
    createdAt: new Date().toISOString(),
    seeds: allSeeds,
    families,
    trust: {
      score: Math.round(trustScore * 1000) / 1000,
      stats: {
        dsseValid: allSeeds.filter(s => s.dsse.valid).length,
        conformant: allSeeds.filter(s => !quarantine.find(q => q.hash === s.hash)).length,
        ageMedian: '0'
      }
    },
    quarantine
  };

  // Write manifest
  writeFileSync(options.manifestPath, JSON.stringify(manifest, null, 2));

  if (options.verbose) {
    console.error(`✓ Updated manifest: ${allSeeds.length} seeds, trust=${trustScore.toFixed(3)}, quarantine=${quarantine.length}`);
  }
}

/**
 * Print help
 */
function printHelp(): void {
  console.log('Federation Ingest Tool');
  console.log('');
  console.log('Usage:');
  console.log('  ts-node tools/fed/ingest.ts [options] <directory>');
  console.log('');
  console.log('Options:');
  console.log('  --format=auto|tiles|operon   Input format (default: auto)');
  console.log('  --vault=<dir>               Vault directory (default: vault/fed)');
  console.log('  --manifest=<file>           Manifest file (default: dist/fed/manifest.json)');
  console.log('  --index=<file>              GID index file (default: dist/fed/index.json)');
  console.log('  --diagnostics=<dir>         Diagnostics directory (default: diagnostics/fed)');
  console.log('  --verbose, -v               Verbose output');
  console.log('  --help, -h                  Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  ts-node tools/fed/ingest.ts seeds/garden');
  console.log('  ts-node tools/fed/ingest.ts --format=operon seeds/');
  console.log('  ts-node tools/fed/ingest.ts --verbose seeds/garden');
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Parse options
  const options: IngestOptions = {
    format: 'auto',
    vaultDir: 'vault/fed',
    manifestPath: 'dist/fed/manifest.json',
    indexPath: 'dist/fed/index.json',
    diagnosticsDir: 'diagnostics/fed',
    verbose: false
  };

  let inputDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg.startsWith('--format=')) {
      const format = arg.split('=')[1] as 'auto' | 'tiles' | 'operon';
      if (!format || !['auto', 'tiles', 'operon'].includes(format)) {
        console.error(`Error: Invalid format: ${format}`);
        process.exit(1);
      }
      options.format = format;
    } else if (arg.startsWith('--vault=')) {
      const vaultDir = arg.split('=')[1];
      if (!vaultDir) {
        console.error('Error: --vault requires a directory path');
        process.exit(1);
      }
      options.vaultDir = vaultDir;
    } else if (arg.startsWith('--manifest=')) {
      const manifestPath = arg.split('=')[1];
      if (!manifestPath) {
        console.error('Error: --manifest requires a file path');
        process.exit(1);
      }
      options.manifestPath = manifestPath;
    } else if (arg.startsWith('--index=')) {
      const indexPath = arg.split('=')[1];
      if (!indexPath) {
        console.error('Error: --index requires a file path');
        process.exit(1);
      }
      options.indexPath = indexPath;
    } else if (arg.startsWith('--diagnostics=')) {
      const diagnosticsDir = arg.split('=')[1];
      if (!diagnosticsDir) {
        console.error('Error: --diagnostics requires a directory path');
        process.exit(1);
      }
      options.diagnosticsDir = diagnosticsDir;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (!arg.startsWith('--')) {
      inputDir = arg;
    } else {
      console.error(`Error: Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  if (!inputDir) {
    console.error('Error: Input directory required');
    process.exit(1);
  }

  try {
    // Ensure directories exist
    mkdirSync(options.vaultDir, { recursive: true });
    mkdirSync(join(options.manifestPath, '..'), { recursive: true });
    mkdirSync(join(options.indexPath, '..'), { recursive: true });
    mkdirSync(options.diagnosticsDir, { recursive: true });

    if (options.verbose) {
      console.error(`Processing directory: ${inputDir}`);
      console.error(`Format: ${options.format}`);
      console.error(`Vault: ${options.vaultDir}`);
      console.error(`Manifest: ${options.manifestPath}`);
      console.error(`Index: ${options.indexPath}`);
      console.error(`Diagnostics: ${options.diagnosticsDir}`);
    }

    // Process seeds
    const seedEntries = await processDirectory(inputDir, options);

    if (seedEntries.length === 0) {
      console.error('No valid seeds found');
      process.exit(1);
    }

    // Update manifest
    updateManifest(seedEntries, options);

    console.log(`Successfully ingested ${seedEntries.length} seeds`);

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}