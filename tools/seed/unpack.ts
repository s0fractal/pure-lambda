#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * PL-SEED-01 Unpacker
 *
 * Usage:
 *   ts-node tools/seed/unpack.ts dist/seeds/focus-delay.seed.json > dist/seeds/focus-delay.operon.json
 *   ts-node tools/seed/unpack.ts --verify dist/seeds/focus-delay.seed.json
 */

import { readFileSync } from 'fs';
import { validateSeed, type Seed, type OperonJson } from '../../src/seed/schema';
import { canonicalize } from '../../src/seed/canonical';
import { verifyEnvelope } from '../attest';

interface UnpackerOptions {
  verify: boolean;
}

interface DSSEEnvelope {
  payloadType: string;
  payloadBase64: string;
  signatures: Array<{
    keyid: string;
    sigBase64: string;
  }>;
}

/**
 * Check if input is a DSSE envelope
 */
function isDSSEEnvelope(data: any): data is DSSEEnvelope {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.payloadType === 'string' &&
    typeof data.payloadBase64 === 'string' &&
    Array.isArray(data.signatures)
  );
}

/**
 * Extract seed from DSSE envelope
 */
function extractSeedFromEnvelope(envelope: DSSEEnvelope): Seed {
  if (envelope.payloadType !== 'purelambda/seed+json' &&
      envelope.payloadType !== 'purelambda/provenance+json') {
    throw new Error(`Unsupported payload type: ${envelope.payloadType}`);
  }

  try {
    const payloadJson = Buffer.from(envelope.payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);

    // If it's a provenance envelope, we can't extract a seed from it
    if (envelope.payloadType === 'purelambda/provenance+json') {
      throw new Error('Cannot unpack provenance envelope as seed');
    }

    return validateSeed(payload);
  } catch (error) {
    throw new Error(`Failed to extract seed from envelope: ${error}`);
  }
}

/**
 * Strip excluded fields from object for round-trip comparison
 * Excludes: createdAt, meta.stats
 */
function stripExcludedFields(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(stripExcludedFields);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip excluded fields
    if (key === 'createdAt') {
      continue;
    }

    if (key === 'meta' && value && typeof value === 'object') {
      const metaCopy = { ...value } as any;
      delete metaCopy.stats;
      result[key] = stripExcludedFields(metaCopy);
    } else {
      result[key] = stripExcludedFields(value);
    }
  }

  return result;
}

/**
 * Compare two objects for round-trip equality
 * Returns true if they match after excluding fields that shouldn't be compared
 */
function roundTripEqual(original: any, roundTripped: any): boolean {
  const strippedOriginal = stripExcludedFields(original);
  const strippedRoundTripped = stripExcludedFields(roundTripped);

  const canonicalOriginal = canonicalize(strippedOriginal);
  const canonicalRoundTripped = canonicalize(strippedRoundTripped);

  return canonicalOriginal === canonicalRoundTripped;
}

/**
 * Convert seed tiles to operon JSON format
 */
function tilesToOperon(seed: Seed): OperonJson {
  const nodes: Record<string, any> = {};
  let nodeCounter = 0;

  // Generate deterministic node IDs based on tile hashes
  const gidToNodeId = new Map<string, string>();

  // Create nodes from tiles
  for (let i = 0; i < seed.tiles.length; i++) {
    const tile = seed.tiles[i];
    if (!tile) continue;

    const gid = seed.meta.gidSet[i] || '0'.repeat(64);
    const iid = seed.meta.iidSet[i] || '0'.repeat(64);
    const xid = seed.meta.xidSet[i] || '0'.repeat(64);

    // Generate a deterministic node ID
    const nodeId = `baf${gid.slice(0, 32)}${iid.slice(0, 32)}`.slice(0, 62);
    gidToNodeId.set(gid, nodeId);

    nodes[nodeId] = {
      op: tile.op,
      code: tile.code,
      abi: tile.abi,
      ports: tile.abi.ports,
      law: tile.law,
      cost: tile.cost,
      gid: gid,
      iid: iid,
      xid: xid,
      links: {}, // TODO: Reconstruct from XID analysis
      receipt: null
    };
  }

  // Create a meta node that lists all operons
  const metaNodeId = `baf${seed.meta.gidSet[0]?.slice(0, 32) || '0'.repeat(32)}${seed.meta.iidSet[0]?.slice(0, 32) || '0'.repeat(32)}meta`.slice(0, 62);
  const nodeIds = Object.keys(nodes);

  if (nodeIds.length > 0) {
    nodes[metaNodeId] = {
      oids: nodeIds,
      root: nodeIds[0] // Use first node as root
    };
  }

  // Determine root node (use meta node if we have multiple tiles, otherwise first tile)
  const rootNodeId = nodeIds.length > 1 ? metaNodeId : nodeIds[0] || metaNodeId;

  const operon: OperonJson = {
    nodes,
    root: rootNodeId,
    name: seed.name,
    gidSet: seed.meta.gidSet,
    iidSet: seed.meta.iidSet,
    expected: {
      minRouteLen: seed.meta.stats.hops,
      invariants: [
        'GID independent of ports',
        'IID equal for abi-equal'
      ]
    }
  };

  return operon;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  let inputFile: string | undefined;
  let options: UnpackerOptions = { verify: false };

  // Parse arguments
  let argIndex = 0;
  while (argIndex < args.length) {
    const arg = args[argIndex];

    if (arg === '--verify') {
      options.verify = true;
      argIndex++;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage:');
      console.log('  ts-node tools/seed/unpack.ts [--verify] <seed-file>');
      console.log('');
      console.log('Options:');
      console.log('  --verify    Verify DSSE envelope signature (requires PL_ED25519_SECRET)');
      console.log('  --help, -h  Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  ts-node tools/seed/unpack.ts dist/seeds/focus-delay.seed.json');
      console.log('  ts-node tools/seed/unpack.ts --verify dist/seeds/focus-delay.seed.json');
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
    // Read and parse input
    const inputContent = readFileSync(inputFile, 'utf8');
    const inputData = JSON.parse(inputContent);

    let seed: Seed;

    // Check if input is a DSSE envelope or raw seed
    if (isDSSEEnvelope(inputData)) {
      if (options.verify) {
        // Write envelope to temp file for verification
        const tempFile = '/tmp/envelope-temp.json';
        require('fs').writeFileSync(tempFile, inputContent);

        try {
          const isValid = verifyEnvelope(tempFile);
          if (!isValid) {
            console.error('❌ Envelope verification failed');
            process.exit(1);
          }
          console.error('✅ Envelope verification successful');
        } catch (error) {
          console.error('❌ Envelope verification failed:', error);
          process.exit(1);
        } finally {
          // Clean up temp file
          try {
            require('fs').unlinkSync(tempFile);
          } catch {}
        }
      }

      seed = extractSeedFromEnvelope(inputData);
    } else {
      // Assume raw seed format
      seed = validateSeed(inputData);

      if (options.verify) {
        console.error('⚠️  Raw seed provided, no envelope to verify');
      }
    }

    // Convert seed to operon format
    const operon = tilesToOperon(seed);

    // Output operon JSON with deterministic formatting
    console.log(JSON.stringify(operon, null, 2));

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

export { tilesToOperon, extractSeedFromEnvelope, isDSSEEnvelope, roundTripEqual, stripExcludedFields };