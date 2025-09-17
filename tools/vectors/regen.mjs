#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Vector Regeneration Tool
 *
 * Regenerates expected test vectors when mismatches are only due to canonical form changes.
 * Used when the implementation is correct but the canonical representation has evolved.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { normalizeSeed } from '../seed/normalize.ts';
import { canonicalBytes, canonicalJson } from '../../scripts/attest/canonical-bytes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Configuration
const config = {
  vectors: {
    garden: path.join(projectRoot, 'tests', 'vectors', 'garden', 'vectors.jsonl'),
    gid_iid_xid: path.join(projectRoot, 'tests', 'vectors', 'gid_iid_xid', 'vectors.jsonl'),
    nf: path.join(projectRoot, 'tests', 'vectors', 'nf', 'vectors.jsonl'),
    autopilot: path.join(projectRoot, 'tests', 'vectors', 'autopilot', 'vectors.jsonl')
  },
  seeds: path.join(projectRoot, 'seeds')
};

class VectorRegenerator {
  constructor(options = {}) {
    this.canonOnly = options.canonOnly || false;
    this.vectorFamily = options.vectorFamily || 'garden';
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
  }

  async regenerateVectors() {
    console.log(`🔄 Regenerating ${this.vectorFamily} vectors${this.canonOnly ? ' (canon-only mode)' : ''}...`);

    const vectorFile = config.vectors[this.vectorFamily];
    if (!fs.existsSync(vectorFile)) {
      throw new Error(`Vector file not found: ${vectorFile}`);
    }

    // Read existing vectors
    const vectorsContent = fs.readFileSync(vectorFile, 'utf8');
    const vectors = vectorsContent.trim().split('\n').map(line => JSON.parse(line));

    console.log(`📋 Found ${vectors.length} vectors to process`);

    let regeneratedCount = 0;
    const newVectors = [];

    for (const vector of vectors) {
      try {
        const regenerated = await this.regenerateVector(vector);
        newVectors.push(regenerated);

        if (regenerated !== vector) {
          regeneratedCount++;
          if (this.verbose) {
            console.log(`  ✓ Regenerated: ${vector.name}`);
          }
        }
      } catch (error) {
        console.warn(`  ⚠️ Warning: Could not regenerate ${vector.name}: ${error.message}`);
        newVectors.push(vector); // Keep original on error
      }
    }

    if (regeneratedCount === 0) {
      console.log(`✅ No vectors needed regeneration`);
      return;
    }

    console.log(`🔧 Regenerated ${regeneratedCount}/${vectors.length} vectors`);

    if (this.dryRun) {
      console.log(`🔍 Dry run - would update: ${vectorFile}`);
      return;
    }

    // Write updated vectors back to file
    const newContent = newVectors.map(v => JSON.stringify(v)).join('\n');
    fs.writeFileSync(vectorFile, newContent);

    console.log(`💾 Updated vector file: ${vectorFile}`);
  }

  async regenerateVector(vector) {
    switch (this.vectorFamily) {
      case 'garden':
        return await this.regenerateGardenVector(vector);
      case 'gid_iid_xid':
        return await this.regenerateGidIidXidVector(vector);
      case 'nf':
        return await this.regenerateNfVector(vector);
      case 'autopilot':
        return await this.regenerateAutopilotVector(vector);
      default:
        throw new Error(`Unknown vector family: ${this.vectorFamily}`);
    }
  }

  async regenerateGardenVector(vector) {
    if (!vector.seedJson || !fs.existsSync(vector.seedJson)) {
      throw new Error(`Seed file not found: ${vector.seedJson}`);
    }

    // Read and normalize the seed
    const seedContent = fs.readFileSync(vector.seedJson, 'utf8');
    let seedData = JSON.parse(seedContent);

    if (this.canonOnly) {
      // Only regenerate if this is purely a canonical representation change
      const normalized = await normalizeSeed(seedData);
      const canonicalSeed = normalized.seedTiles;

      // Update the seed file with canonical form
      const canonicalBytes = canonicalJson(canonicalSeed);
      const prettified = JSON.stringify(JSON.parse(canonicalBytes), null, 2);

      if (!this.dryRun) {
        fs.writeFileSync(vector.seedJson, prettified);
      }

      // Update vector expectations if needed based on canonical form
      const newVector = { ...vector };

      // Update expected gidSet and iidSet if they exist
      if (normalized.gidSet && normalized.gidSet.length > 0) {
        if (!newVector.expect) newVector.expect = {};
        newVector.expect.gidSet = normalized.gidSet;
        newVector.expect.iidSet = normalized.iidSet;
      }

      return newVector;
    }

    // Full regeneration - recompute all expected values
    const normalized = await normalizeSeed(seedData);
    const newVector = { ...vector };

    // Update expectations based on normalized seed
    if (!newVector.expect) newVector.expect = {};

    // Recompute structural expectations
    const nodes = normalized.seedTiles.tiles || [];
    newVector.expect.minRouteLen = Math.max(nodes.length, 1);

    // Update hash sets
    if (normalized.gidSet) {
      newVector.expect.gidSet = normalized.gidSet;
      newVector.expect.gidStable = true;
    }

    if (normalized.iidSet) {
      newVector.expect.iidSet = normalized.iidSet;
      newVector.expect.iidStable = true;
    }

    // Recompute pattern expectations
    const ops = nodes.map(tile => tile.op).filter(op => op && op !== 'ROOT');
    if (ops.length > 0) {
      newVector.expect.opSequence = ops;
    }

    const laws = nodes.map(tile => tile.law).filter(law => law && law !== 'unknown');
    if (laws.length > 0) {
      newVector.expect.lawTypes = [...new Set(laws)];
    }

    return newVector;
  }

  async regenerateGidIidXidVector(vector) {
    // For GID/IID/XID vectors, only regenerate if canonical representation changed
    if (!this.canonOnly) {
      return vector; // These vectors are manually crafted for specific invariant tests
    }

    // Apply canonical normalization to tileYaml if present
    if (vector.tileYaml) {
      const newVector = { ...vector };

      // TODO: Apply canonical normalization to YAML content
      // This would involve parsing the YAML, normalizing the structure,
      // and regenerating canonical YAML representation

      return newVector;
    }

    return vector;
  }

  async regenerateNfVector(vector) {
    // NF vectors contain performance expectations - only update canonical form
    if (!this.canonOnly) {
      return vector;
    }

    // Apply canonical normalization to operonJson
    if (vector.operonJson) {
      const newVector = { ...vector };
      newVector.operonJson = JSON.parse(canonicalJson(vector.operonJson));
      return newVector;
    }

    return vector;
  }

  async regenerateAutopilotVector(vector) {
    // Autopilot vectors contain regret analysis - only update canonical form
    if (!this.canonOnly) {
      return vector;
    }

    // Apply canonical normalization to operonJson
    if (vector.operonJson) {
      const newVector = { ...vector };
      newVector.operonJson = JSON.parse(canonicalJson(vector.operonJson));
      return newVector;
    }

    return vector;
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Vector Regeneration Tool');
    console.log('');
    console.log('Usage:');
    console.log('  node tools/vectors/regen.mjs [options]');
    console.log('');
    console.log('Options:');
    console.log('  --canon-only      Only regenerate canonical representations');
    console.log('  --family=TYPE     Vector family to regenerate (garden, gid_iid_xid, nf, autopilot)');
    console.log('  --dry-run         Show what would be changed without making changes');
    console.log('  --verbose         Show detailed progress');
    console.log('  --help, -h        Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node tools/vectors/regen.mjs --canon-only --family=garden');
    console.log('  node tools/vectors/regen.mjs --dry-run --family=all');
    process.exit(0);
  }

  const options = {
    canonOnly: args.includes('--canon-only'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    vectorFamily: (args.find(arg => arg.startsWith('--family='))?.split('=')[1]) || 'garden'
  };

  try {
    if (options.vectorFamily === 'all') {
      // Regenerate all vector families
      for (const family of ['garden', 'gid_iid_xid', 'nf', 'autopilot']) {
        const regenerator = new VectorRegenerator({ ...options, vectorFamily: family });
        await regenerator.regenerateVectors();
        console.log('');
      }
    } else {
      const regenerator = new VectorRegenerator(options);
      await regenerator.regenerateVectors();
    }

    console.log('🎉 Vector regeneration complete');

  } catch (error) {
    console.error('💥 Vector regeneration failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { VectorRegenerator };