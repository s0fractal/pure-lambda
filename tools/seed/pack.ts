#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * PL-SEED-01 Packer
 *
 * Usage:
 *   ts-node tools/seed/pack.ts seeds/focus-delay.json > dist/seeds/focus-delay.seed.json
 *   ts-node tools/seed/pack.ts --attest seeds/focus-delay.json > dist/seeds/focus-delay.seed.json
 */

import { readFileSync } from 'fs';
import { validateSeed, canonicalizeJSON, computeHash, type Seed, type TileObject, type OperonJson } from '../../src/seed/schema';
import { canonicalize } from '../../src/seed/canonical';
import { createEnvelope } from '../attest';

const { processTile } = require('../gid');

interface PackerOptions {
  attest: boolean;
}

/**
 * Convert operon JSON to tiles array
 */
function operonToTiles(operon: OperonJson): TileObject[] {
  const tiles: TileObject[] = [];

  // Check if the operon has nodes property
  if (!operon.nodes || typeof operon.nodes !== 'object') {
    throw new Error('Invalid operon format: missing or invalid nodes property');
  }

  for (const [nodeId, node] of Object.entries(operon.nodes)) {
    // Skip meta nodes (nodes with oids property)
    if ('oids' in node) {
      continue;
    }

    const tile: TileObject = {
      op: node.op || 'UNKNOWN',
      code: node.code,
      abi: {
        types: node.abi?.types || 'unknown -> unknown',
        effects: node.abi?.effects || [],
        ports: node.ports || {}
      },
      law: node.law || 'unknown',
      cost: node.cost || 'O(?)'
    };

    tiles.push(tile);
  }

  return tiles;
}

/**
 * Compute gid/iid/xid sets from tiles
 */
function computeHashSets(tiles: TileObject[]): { gidSet: string[]; iidSet: string[]; xidSet: string[] } {
  const gidSet: string[] = [];
  const iidSet: string[] = [];
  const xidSet: string[] = [];

  for (const tile of tiles) {
    try {
      // Convert tile to format expected by gid.ts
      const gidTile = {
        op: tile.op,
        code: tile.code,
        abi: tile.abi,
        ports: tile.abi.ports,
        law: tile.law,
        cost: tile.cost,
        neighborIIDs: {} // TODO: Compute from operon graph
      };

      const result = processTile(gidTile);
      gidSet.push(result.gid);
      iidSet.push(result.iid);
      xidSet.push(result.xid);
    } catch (error) {
      console.error(`Error processing tile ${tile.op}:`, error);
      throw new Error(`Failed to compute hashes for tile ${tile.op}`);
    }
  }

  // Remove duplicates and sort for deterministic output
  return {
    gidSet: [...new Set(gidSet)].sort(),
    iidSet: [...new Set(iidSet)].sort(),
    xidSet: [...new Set(xidSet)].sort()
  };
}

/**
 * Estimate basic stats from tiles
 */
function estimateStats(tiles: TileObject[]): { hops: number; latency: number; mem: number } {
  // Simple heuristics for demonstration
  const hops = tiles.length; // One hop per tile
  const latency = tiles.length * 0.001; // 1ms per tile
  const mem = tiles.length * 1024; // 1KB per tile

  return { hops, latency, mem };
}

/**
 * Pack operon JSON into PL-SEED-01 format
 */
function packOperon(operonJson: OperonJson, name?: string): Seed {
  const tiles = operonToTiles(operonJson);

  if (tiles.length === 0) {
    throw new Error('No tiles found in operon');
  }

  const hashSets = computeHashSets(tiles);
  const stats = estimateStats(tiles);

  const seed: Seed = {
    pl_seed: 'PL-SEED-01',
    name: name || operonJson.name || 'unnamed',
    version: 1,
    createdAt: new Date().toISOString(),
    tiles,
    meta: {
      ...hashSets,
      stats
    }
  };

  // Validate the generated seed
  validateSeed(seed);

  return seed;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  let inputFile: string | undefined;
  let options: PackerOptions = { attest: false };

  // Parse arguments
  let argIndex = 0;
  while (argIndex < args.length) {
    const arg = args[argIndex];

    if (arg === '--attest') {
      options.attest = true;
      argIndex++;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage:');
      console.log('  ts-node tools/seed/pack.ts [--attest] <operon-file>');
      console.log('');
      console.log('Options:');
      console.log('  --attest    Wrap output in DSSE envelope (requires PL_ED25519_SECRET)');
      console.log('  --help, -h  Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  ts-node tools/seed/pack.ts seeds/focus-delay.json');
      console.log('  ts-node tools/seed/pack.ts --attest seeds/focus-delay.json');
      process.exit(0);
    } else if (!inputFile) {
      inputFile = arg;
      argIndex++;
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  if (!inputFile) {
    console.error('Error: Input file required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  try {
    // Read and parse input operon
    const operonContent = readFileSync(inputFile, 'utf8');
    const operonJson: OperonJson = JSON.parse(operonContent);

    // Extract name from filename if not in operon
    const fileName = inputFile.split('/').pop()?.replace(/\.json$/, '') || 'unnamed';

    // Pack into seed format
    const seed = packOperon(operonJson, operonJson.name || fileName);

    if (options.attest) {
      // Create temporary file with seed JSON for attestation using canonical format
      const seedJson = canonicalize(seed);
      const tempFile = '/tmp/seed-temp.json';
      require('fs').writeFileSync(tempFile, seedJson);

      try {
        const envelope = createEnvelope(tempFile);
        console.log(JSON.stringify(envelope, null, 2));
      } catch (error) {
        console.error('Attestation failed:', error);
        console.error('Note: Set PL_ED25519_SECRET environment variable for attestation');
        process.exit(1);
      } finally {
        // Clean up temp file
        try {
          require('fs').unlinkSync(tempFile);
        } catch {}
      }
    } else {
      // Output deterministic canonical JSON
      console.log(canonicalize(seed));
    }

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { packOperon, operonToTiles, computeHashSets };