#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * IPLD Export for B2 Operons
 * Creates deterministic CAR files from tile directories
 */

const { readFileSync, writeFileSync, readdirSync, mkdirSync } = require('fs');
const { join, extname, basename } = require('path');
const { parse } = require('yaml');
const { createHash } = require('crypto');
const { processTile } = require('./gid');

// Fallback to avoid ESM-only multiformats in CommonJS context
let CID: any = null;
let dagCBOR: any = null;
let sha256: any = null;
let CarWriter: any = null;

try {
  ({ CID } = require('multiformats/cid'));
  dagCBOR = require('@ipld/dag-cbor');
  ({ sha256 } = require('multiformats/hashes/sha2'));
  ({ CarWriter } = require('@ipld/car'));
} catch (error) {
  console.warn('⚠️ IPLD dependencies not available in CommonJS context, using fallback');
}

interface TileSchema {
  op: string;
  code?: string;
  abi?: any;
  ports?: Record<string, string>;
  law?: string;
  cost?: string;
  neighborIIDs?: Record<string, string>;
}

interface IPLDTile {
  op: string;
  gid: string;
  iid: string;
  xid: string;
  ports: Record<string, string>;
  cost: string;
  law: string;
  receipt: null | any; // CID link in full implementation
  links: Record<string, any>; // Port connections as CID links
}

interface IPLDOperon {
  root: any; // CID link to root tile
  oids: any[]; // Array of CID links to tiles
}

/**
 * Create deterministic IPLD object with sorted keys
 */
function createIPLDObject(obj: any): any {
  function sortKeys(item: any): any {
    if (Array.isArray(item)) {
      return item.map(sortKeys);
    }

    if (item !== null && typeof item === 'object' && !(CID && CID.asCID && CID.asCID(item))) {
      const sorted: any = {};
      Object.keys(item).sort().forEach(key => {
        sorted[key] = sortKeys(item[key]);
      });
      return sorted;
    }

    return item;
  }

  return sortKeys(obj);
}

/**
 * Create deterministic pseudo-CID from object (fallback when IPLD not available)
 */
function createPseudoCID(obj: any): string {
  const sortedObj = createIPLDObject(obj);
  const json = JSON.stringify(sortedObj);
  const hash = createHash('sha256').update(json).digest('hex');
  return `baf${hash.slice(0, 56)}`; // Pseudo-CID format
}

/**
 * Create CID from object (real or pseudo depending on availability)
 */
async function createCID(obj: any): Promise<any> {
  if (CID && dagCBOR && sha256) {
    const sortedObj = createIPLDObject(obj);
    const encoded = dagCBOR.encode(sortedObj);
    const hash = await sha256.digest(encoded);
    return CID.create(1, dagCBOR.code, hash);
  } else {
    // Fallback to pseudo-CID
    return createPseudoCID(obj);
  }
}

/**
 * Convert tile to IPLD format
 */
async function tileToIPLD(tile: TileSchema, filename: string): Promise<{ cid: any; ipld: IPLDTile }> {
  const hashes = processTile(tile);

  const ipldTile: IPLDTile = {
    op: tile.op,
    gid: hashes.gid,
    iid: hashes.iid,
    xid: hashes.xid,
    ports: tile.ports || {},
    cost: tile.cost || 'unknown',
    law: tile.law || 'unknown',
    receipt: null, // Would be CID link in full implementation
    links: {} // Port connections as CID links - simplified for now
  };

  const cid = await createCID(ipldTile);
  return { cid, ipld: ipldTile };
}

/**
 * Read all YAML files from directory
 */
function readTileDirectory(dirPath: string): Array<{ filename: string; tile: TileSchema }> {
  const files = readdirSync(dirPath)
    .filter((f: string) => extname(f).toLowerCase() === '.yaml')
    .sort(); // Deterministic ordering

  return files.map((filename: string) => {
    const filePath = join(dirPath, filename);
    const content = readFileSync(filePath, 'utf8');
    const tile: TileSchema = parse(content);

    return { filename, tile };
  });
}

/**
 * Export operon to JSON file (fallback format)
 */
async function exportToJSON(inputDir: string, outputPath: string): Promise<any> {
  // Read all tiles
  const tileFiles = readTileDirectory(inputDir);

  if (tileFiles.length === 0) {
    throw new Error(`No YAML files found in ${inputDir}`);
  }

  // Convert tiles to IPLD
  const ipldTiles = await Promise.all(
    tileFiles.map(({ filename, tile }) => tileToIPLD(tile, filename))
  );

  // Create operon DAG with stable serialization
  const tileCIDs = ipldTiles.map(t => t.cid);
  const rootTile = ipldTiles[0]!; // First tile as root

  const operon = {
    root: rootTile.cid,
    oids: tileCIDs
  };

  const operonCID = await createCID(operon);

  // Create nodes object with CID keys
  const nodes: Record<string, any> = {};

  // Add operon root
  const operonCIDStr = typeof operonCID === 'string' ? operonCID : operonCID.toString();
  nodes[operonCIDStr] = createIPLDObject(operon);

  // Add all tiles
  for (const { cid, ipld } of ipldTiles) {
    const cidStr = typeof cid === 'string' ? cid : cid.toString();
    nodes[cidStr] = createIPLDObject(ipld);
  }

  // Create JSON DAG with stable key ordering
  const jsonDAG = {
    nodes: Object.keys(nodes)
      .sort() // Stable ordering of CID keys
      .reduce((sorted: Record<string, any>, key) => {
        sorted[key] = nodes[key];
        return sorted;
      }, {}),
    root: typeof operonCID === 'string' ? operonCID : operonCID.toString()
  };

  // Write JSON file with stable serialization
  mkdirSync('dist', { recursive: true });
  writeFileSync(outputPath, JSON.stringify(jsonDAG, null, 2), 'utf8');

  return operonCID;
}

/**
 * Export operon to CAR file
 */
async function exportToCAR(inputDir: string, outputPath: string): Promise<any> {
  // Read all tiles
  const tileFiles = readTileDirectory(inputDir);

  if (tileFiles.length === 0) {
    throw new Error(`No YAML files found in ${inputDir}`);
  }

  // Convert tiles to IPLD
  const ipldTiles = await Promise.all(
    tileFiles.map(({ filename, tile }) => tileToIPLD(tile, filename))
  );

  // Create operon DAG
  const tileCIDs = ipldTiles.map(t => t.cid);
  const rootTile = ipldTiles[0]!; // First tile as root

  const operon: IPLDOperon = {
    root: rootTile.cid,
    oids: tileCIDs
  };

  const operonCID = await createCID(operon);

  // Create CAR file (if IPLD available)
  mkdirSync('dist', { recursive: true });

  if (CarWriter && dagCBOR && typeof operonCID === 'object') {
    const { writer, out } = await CarWriter.create([operonCID]);

    // Add all objects to CAR
    await writer.put({ cid: operonCID, bytes: dagCBOR.encode(createIPLDObject(operon)) });

    for (const { cid, ipld } of ipldTiles) {
      await writer.put({ cid, bytes: dagCBOR.encode(createIPLDObject(ipld)) });
    }

    await writer.close();

    // Write to file
    const carBytes = new Uint8Array(await streamToArrayBuffer(out));
    writeFileSync(outputPath, carBytes);
  } else {
    // Fallback: write JSON representation instead of CAR
    console.warn('⚠️ CAR format not available, writing JSON instead');
    const jsonData: any = {
      format: 'json-fallback',
      nodes: {},
      root: typeof operonCID === 'string' ? operonCID : operonCID.toString()
    };

    const operonCIDStr = typeof operonCID === 'string' ? operonCID : operonCID.toString();
    (jsonData.nodes as any)[operonCIDStr] = createIPLDObject(operon);

    for (const { cid, ipld } of ipldTiles) {
      const cidStr = typeof cid === 'string' ? cid : cid.toString();
      (jsonData.nodes as any)[cidStr] = createIPLDObject(ipld);
    }

    writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
  }

  return operonCID;
}

/**
 * Convert ReadableStream to ArrayBuffer
 */
async function streamToArrayBuffer(stream: ReadableStream): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const inputDir = args[0] || 'fixtures/tiles';
  const outputPath = args[1] || 'dist/operon.car';

  // Check for --json flag or .json extension
  const jsonFlag = args.find(arg => arg === '--json');
  const jsonPath = args.find(arg => arg.startsWith('--json='))?.split('=')[1] ||
                   (jsonFlag && args[args.indexOf(jsonFlag) + 1]) ||
                   (outputPath.endsWith('.json') ? outputPath : null);

  try {
    console.log(`🔗 Exporting operon from ${inputDir}`);

    const rootCID = await exportToCAR(inputDir, outputPath);

    console.log(`✅ CAR file written: ${outputPath}`);
    console.log(`📦 Root CID: ${rootCID.toString()}`);

    // Also export JSON if requested
    if (jsonPath) {
      const jsonRootCID = await exportToJSON(inputDir, jsonPath);
      console.log(`✅ JSON file written: ${jsonPath}`);

      // Verify CIDs match
      if (jsonRootCID.toString() !== rootCID.toString()) {
        console.warn(`⚠️  Warning: CID mismatch between CAR and JSON exports`);
      }
    }

    // Show summary
    const tileFiles = readTileDirectory(inputDir);
    console.log(`📊 Exported ${tileFiles.length} tiles to IPLD DAG`);

  } catch (error) {
    console.error('Error exporting:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { exportToCAR, exportToJSON, tileToIPLD };
