#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Seed Format Normalizer
 *
 * Converts between operon and tiles formats and provides canonical normalization
 */

const { processTile, calculateGID, calculateIID, calculateXID, pnfLite } = require('../gid');
const { validateSeed } = require('../../src/seed/schema');
const { canonicalize } = require('../../src/seed/canonical');

// Type imports for TypeScript
type Seed = any;
type TileObject = any;
type TileABI = any;

export interface NormalizeResult {
  format: 'tiles' | 'operon' | 'unknown';
  seedTiles: object;
  gidSet: string[];
  iidSet: string[];
  xidSet: string[];
  canonicalJson: string;
}

/**
 * Apply PNF-LITE normalization to a tile for canonical form
 * - Normalize code using pnfLite (α-rename, neighborIIDs sorted, numbers normalized)
 * - Sort all object keys
 * - Ensure deterministic field ordering
 */
function normalizeTile(tile: TileObject): TileObject {
  const normalized: TileObject = {};

  // Normalize fields in canonical order
  if (tile.op !== undefined) {
    normalized.op = tile.op;
  }

  if (tile.code !== undefined) {
    // Apply PNF-LITE normalization to code
    normalized.code = pnfLite(tile.code);
  }

  if (tile.abi !== undefined) {
    const abi: any = {};

    // Sort abi fields
    if (tile.abi.types !== undefined) {
      abi.types = tile.abi.types;
    }
    if (tile.abi.effects !== undefined) {
      // Keep array order but ensure it's canonical
      abi.effects = Array.isArray(tile.abi.effects)
        ? [...tile.abi.effects].sort()
        : tile.abi.effects;
    }
    if (tile.abi.ports !== undefined) {
      // Sort port keys
      const sortedPorts: any = {};
      const portKeys = Object.keys(tile.abi.ports).sort();
      for (const key of portKeys) {
        sortedPorts[key] = tile.abi.ports[key];
      }
      abi.ports = sortedPorts;
    }

    normalized.abi = abi;
  }

  if (tile.law !== undefined) {
    normalized.law = tile.law;
  }

  if (tile.cost !== undefined) {
    normalized.cost = tile.cost;
  }

  // Handle neighborIIDs for XID calculation - sort keys
  if (tile.neighborIIDs !== undefined) {
    const sortedNeighborIIDs: any = {};
    const neighborKeys = Object.keys(tile.neighborIIDs).sort();
    for (const key of neighborKeys) {
      sortedNeighborIIDs[key] = tile.neighborIIDs[key];
    }
    normalized.neighborIIDs = sortedNeighborIIDs;
  }

  return normalized;
}

/**
 * Convert 6-line YAML card format to TileObject
 * Expected format:
 * op: OPERATION
 * code: "actual code here"
 * abi:
 *   types: "input -> output"
 *   effects: []
 *   ports:
 *     in: "input_type"
 *     out: "output_type"
 * law: "behavior_description"
 * cost: "O(1)"
 */
function parseYamlCard(yamlText: string): TileObject {
  const { parse } = require('yaml');
  const card = parse(yamlText);

  if (!card || typeof card !== 'object') {
    throw new Error('Invalid YAML card format');
  }

  return {
    op: card.op || 'UNKNOWN',
    code: card.code,
    abi: {
      types: card.abi?.types || 'unknown -> unknown',
      effects: card.abi?.effects || [],
      ports: card.abi?.ports || {}
    },
    law: card.law || 'unknown',
    cost: card.cost || 'O(1)'
  };
}

/**
 * Convert operon node to TileObject using 6-line schema
 */
function operonNodeToTile(node: any): any {
  // Extract the essential 6-line schema fields
  return {
    op: node.op || 'UNKNOWN',
    code: node.code,
    abi: {
      types: node.abi?.types || 'unknown -> unknown',
      effects: node.abi?.effects || [],
      ports: node.abi?.ports || node.ports || {}
    },
    law: node.law || 'unknown',
    cost: node.cost || 'O(1)'
  };
}

/**
 * Convert operon format to tiles format
 */
function operonToTiles(operonData: any): { tiles: any[], meta: any } {
  const tiles: any[] = [];

  // Check if this is a garden seed format with pre-computed hashes
  const hasPrecomputedHashes = operonData.gidSet && operonData.iidSet;
  let gidSet: string[] = [];
  let iidSet: string[] = [];
  let xidSet: string[] = [];

  // Find leaf nodes (nodes that are not meta/container nodes)
  const leafNodes = Object.entries(operonData.nodes).filter(([nodeId, node]: [string, any]) => {
    return (node as any).op && !(node as any).oids; // Has operation and is not a meta node
  });

  // Process each leaf node into a normalized tile
  for (let i = 0; i < leafNodes.length; i++) {
    const leafNodeEntry = leafNodes[i];
    if (!leafNodeEntry) continue;
    const [nodeId, node] = leafNodeEntry;
    const nodeObj = node as any;
    const tile = operonNodeToTile(nodeObj);
    const normalizedTile = normalizeTile(tile);
    tiles.push(normalizedTile);

    // Check if pre-computed hashes are valid hex strings
    let usePrecomputed = false;
    if (hasPrecomputedHashes && i < operonData.gidSet.length) {
      const preGid = operonData.gidSet[i];
      const preIid = operonData.iidSet[i];
      // Validate they are proper 64-char hex strings
      if (preGid && preGid.length === 64 && /^[0-9a-fA-F]+$/.test(preGid) &&
          preIid && preIid.length === 64 && /^[0-9a-fA-F]+$/.test(preIid)) {
        usePrecomputed = true;
      }
    }

    if (usePrecomputed && i < operonData.gidSet.length) {
      gidSet.push(operonData.gidSet[i]);
      iidSet.push(operonData.iidSet[i]);
      // XID might not be in the top level array, use node's xid or compute
      let xid = nodeObj.xid;
      if (!xid || xid.length !== 64 || !/^[0-9a-fA-F]+$/.test(xid)) {
        xid = calculateXID(normalizedTile, operonData.gidSet[i]);
      }
      xidSet.push(xid);
    } else {
      // Fallback to computing hashes (validate node-level hashes too)
      let gid = nodeObj.gid;
      let iid = nodeObj.iid;

      // Validate node-level hashes are proper hex strings
      if (!gid || gid.length !== 64 || !/^[0-9a-fA-F]+$/.test(gid)) {
        gid = calculateGID(normalizedTile);
      }
      if (!iid || iid.length !== 64 || !/^[0-9a-fA-F]+$/.test(iid)) {
        iid = calculateIID(normalizedTile);
      }

      // For XID calculation, we need neighborIIDs from the node's links
      const tileWithLinks = {
        ...normalizedTile,
        neighborIIDs: {} as Record<string, string>
      };

      // Map links to neighborIIDs for XID calculation
      if (nodeObj.links && typeof nodeObj.links === 'object') {
        for (const [portName, targetNodeId] of Object.entries(nodeObj.links)) {
          const targetNode = operonData.nodes[targetNodeId as string];
          if (targetNode && (targetNode as any).iid) {
            tileWithLinks.neighborIIDs[portName] = (targetNode as any).iid;
          }
        }
      }

      // Sort the neighborIIDs for deterministic ordering
      const sortedNeighborIIDs: any = {};
      const neighborKeys = Object.keys(tileWithLinks.neighborIIDs).sort();
      for (const key of neighborKeys) {
        sortedNeighborIIDs[key] = tileWithLinks.neighborIIDs[key];
      }
      tileWithLinks.neighborIIDs = sortedNeighborIIDs;

      // Validate node-level XID is proper hex string
      let xid = nodeObj.xid;
      if (!xid || xid.length !== 64 || !/^[0-9a-fA-F]+$/.test(xid)) {
        xid = calculateXID(tileWithLinks, gid);
      }

      gidSet.push(gid);
      iidSet.push(iid);
      xidSet.push(xid);
    }
  }

  const meta = {
    gidSet,
    iidSet,
    xidSet,
    stats: {
      hops: operonData.expected?.minRouteLen || tiles.length,
      latency: 0,
      mem: tiles.length
    }
  };

  return { tiles, meta };
}

/**
 * Sniff the format of input data
 */
function sniffFormat(input: any): 'tiles' | 'operon' | 'unknown' {
  if (!input || typeof input !== 'object') {
    return 'unknown';
  }

  // Check for tiles format
  if (Array.isArray(input.tiles)) {
    return 'tiles';
  }

  // Check for explicit tiles array (even if not in full seed structure)
  if (Array.isArray(input) && input.length > 0 && input[0].op) {
    return 'tiles';
  }

  // Check for operon format (including garden seeds with hybrid format)
  if (input.nodes && typeof input.nodes === 'object') {
    return 'operon';
  }

  // Check for explicit operon key
  if (input.operon && typeof input.operon === 'object') {
    return 'operon';
  }

  return 'unknown';
}

/**
 * Main normalization function
 */
export async function normalizeSeed(input: unknown): Promise<NormalizeResult> {
  const format = sniffFormat(input);

  if (format === 'unknown') {
    throw new Error('Unknown input format - expected tiles array or operon structure');
  }

  let seedData: any;
  let tiles: TileObject[];
  let meta: any;

  if (format === 'tiles') {
    // Handle both full seed objects and bare tiles arrays
    if (Array.isArray(input)) {
      // Bare tiles array - convert YAML cards if needed and normalize
      tiles = input.map((item: any, index: number) => {
        let tile: TileObject;
        if (typeof item === 'string') {
          tile = parseYamlCard(item);
        } else if (typeof item === 'object') {
          tile = item as TileObject;
        } else {
          throw new Error(`Invalid tile at index ${index}: expected object or YAML string`);
        }
        return normalizeTile(tile);
      });

      // Compute hashes for bare tiles
      const gidSet: string[] = [];
      const iidSet: string[] = [];
      const xidSet: string[] = [];

      for (const tile of tiles) {
        const gid = calculateGID(tile);
        const iid = calculateIID(tile);
        const xid = calculateXID(tile, gid);
        gidSet.push(gid);
        iidSet.push(iid);
        xidSet.push(xid);
      }

      meta = {
        gidSet,
        iidSet,
        xidSet,
        stats: {
          hops: tiles.length,
          latency: 0,
          mem: tiles.length
        }
      };
    } else {
      // Full seed object - normalize tiles
      const inputData = input as any;
      const rawTiles = inputData.tiles || [];
      tiles = rawTiles.map((tile: TileObject) => normalizeTile(tile));
      meta = inputData.meta || {};

      // Recompute hashes if missing
      if (!meta.gidSet || !meta.iidSet || !meta.xidSet) {
        const gidSet: string[] = [];
        const iidSet: string[] = [];
        const xidSet: string[] = [];

        for (const tile of tiles) {
          const gid = calculateGID(tile);
          const iid = calculateIID(tile);
          const xid = calculateXID(tile, gid);
          gidSet.push(gid);
          iidSet.push(iid);
          xidSet.push(xid);
        }

        meta = {
          ...meta,
          gidSet,
          iidSet,
          xidSet,
          stats: meta.stats || {
            hops: tiles.length,
            latency: 0,
            mem: tiles.length
          }
        };
      }
    }
  } else if (format === 'operon') {
    // Convert operon to tiles
    const operonData = (input as any).operon || input;
    const result = operonToTiles(operonData);
    tiles = result.tiles;
    meta = result.meta;
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }

  // Create canonical seed structure
  const now = new Date().toISOString();
  const seedTiles = {
    pl_seed: "PL-SEED-01" as const,
    version: 1,
    createdAt: now,
    name: (input as any)?.name || 'normalized-seed',
    tiles,
    meta
  };

  // Validate the result
  try {
    validateSeed(seedTiles);
  } catch (error) {
    throw new Error(`Normalized seed validation failed: ${error}`);
  }

  // Sort keys and normalize for deterministic output
  const canonicalSeedTiles = JSON.parse(canonicalize(seedTiles));
  const canonicalJson = canonicalize(canonicalSeedTiles);

  return {
    format,
    seedTiles: canonicalSeedTiles,
    gidSet: meta.gidSet,
    iidSet: meta.iidSet,
    xidSet: meta.xidSet,
    canonicalJson
  };
}

/**
 * CLI execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Seed Format Normalizer');
    console.log('');
    console.log('Usage:');
    console.log('  ts-node tools/seed/normalize.ts < input.json');
    console.log('  ts-node tools/seed/normalize.ts input.json');
    console.log('');
    console.log('Converts operon and tiles formats to canonical tiles format');
    console.log('Outputs normalized seed with computed GID/IID/XID sets');
    process.exit(0);
  }

  try {
    let inputData: any;

    if (args.length > 0) {
      // Read from file
      const { readFileSync } = require('fs');
      const filename = args[0];
      const content = readFileSync(filename, 'utf8');
      inputData = JSON.parse(content);
    } else {
      // Read from stdin
      const { readFileSync } = require('fs');
      const content = readFileSync(0, 'utf8');
      inputData = JSON.parse(content);
    }

    const result = await normalizeSeed(inputData);

    console.log(JSON.stringify(result.seedTiles, null, 2));

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

// Export for CommonJS
module.exports = { normalizeSeed };