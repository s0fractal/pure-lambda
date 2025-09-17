#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * GID/IID/XID Generator for B2 Tiles
 * Deterministic hashing with Pair-Normal Form
 */

const { createHash } = require('crypto');
const { readFileSync } = require('fs');
const { parse } = require('yaml');

interface TileSchema {
  op: string;
  code?: string;
  abi?: {
    types?: string;
    effects?: string[];
    ports?: Record<string, string>;
  };
  ports?: Record<string, string>;
  law?: string;
  cost?: string;
  neighborIIDs?: Record<string, string>; // For XID calculation
}

interface HashResult {
  gid: string;
  iid: string;
  xid: string;
}

/**
 * PNF-LITE: Deterministic code normalization
 * - Trim whitespace, collapse multi-spaces
 * - Remove trailing semicolons
 * - Normalize parentheses: remove redundant ((...))
 * - α-normalize: map identifiers to _x0,_x1,... in order of first appearance
 * - Normalize arrows/symbols to canonical ASCII subset
 */
function pnfLite(code: string): string {
  // Step 1: Basic whitespace normalization
  let normalized = code
    .trim()
    .replace(/\s+/g, ' ')           // Collapse multi-spaces
    .replace(/;+\s*$/gm, '')        // Remove trailing semicolons
    .replace(/\(\s+/g, '(')         // Remove space after (
    .replace(/\s+\)/g, ')');        // Remove space before )

  // Step 2: Remove redundant parentheses (simple cases)
  // Handle (x) => x patterns - remove unnecessary parens around single identifiers
  normalized = normalized.replace(/\(\(([^()]+)\)\)/g, '($1)');
  normalized = normalized.replace(/^\(([a-zA-Z_$][a-zA-Z0-9_$]*)\)\s*=>/g, '$1 =>');

  // Step 3: α-normalization - map identifiers to _x0, _x1, etc.
  const identifiers = new Map<string, string>();
  let counter = 0;

  // Match JavaScript-like identifiers (letters, digits, _, $)
  normalized = normalized.replace(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g, (match) => {
    // Skip reserved words/operators
    const reserved = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'class', 'extends', 'import', 'export', 'from', 'as', 'typeof', 'instanceof', 'in', 'of', 'delete', 'void', 'async', 'await', 'true', 'false', 'null', 'undefined'];

    if (reserved.includes(match)) {
      return match;
    }

    if (!identifiers.has(match)) {
      identifiers.set(match, `_x${counter++}`);
    }
    return identifiers.get(match)!;
  });

  // Step 4: Normalize arrows and symbols to ASCII
  normalized = normalized
    .replace(/\s*=>\s*/g, '=>')     // Normalize fat arrows
    .replace(/\s*->\s*/g, '->')     // Normalize thin arrows
    .replace(/\s*\|\s*/g, '|')      // Normalize pipes
    .replace(/\s*&\s*/g, '&')       // Normalize ampersands
    .replace(/\s*\+\s*/g, '+')       // Normalize plus
    .replace(/\s*-\s*/g, '-')       // Normalize minus
    .replace(/\s*\*\s*/g, '*')       // Normalize multiply
    .replace(/\s*\/\s*/g, '/')       // Normalize divide
    .replace(/\s*=\s*/g, '=')       // Normalize equals
    .replace(/\s*<\s*/g, '<')       // Normalize less than
    .replace(/\s*>\s*/g, '>')       // Normalize greater than
    .toLowerCase();                 // Final case normalization

  return normalized;
}

/**
 * Legacy toPNF function (calls pnfLite)
 */
function toPNF(code: string): string {
  return pnfLite(code);
}

/**
 * Create deterministic canonical bytes from object
 * Stable key ordering, omit undefined values, deterministic number serialization
 */
function canonicalize(obj: any): Buffer {
  // Sort keys recursively for deterministic serialization
  function sortKeys(item: any): any {
    if (Array.isArray(item)) {
      return item.map(sortKeys);
    }

    if (item !== null && typeof item === 'object') {
      const sorted: any = {};
      // Sort keys for deterministic ordering
      Object.keys(item)
        .sort()
        .forEach(key => {
          const value = sortKeys(item[key]);
          // Omit undefined values for stability
          if (value !== undefined) {
            sorted[key] = value;
          }
        });
      return sorted;
    }

    // Ensure deterministic number serialization without locale
    if (typeof item === 'number') {
      return Number(item.toString());
    }

    return item;
  }

  const canonical = sortKeys(obj);
  // Use stable JSON serialization without spaces
  return Buffer.from(JSON.stringify(canonical), 'utf8');
}

/**
 * Compute BLAKE3 hash with SHA-256 fallback
 * Attempts to use BLAKE3 if available, otherwise falls back to SHA-256
 */
function blake3(data: Buffer): string {
  try {
    // Try to use BLAKE3 if available
    const blake3Hash = require('blake3');
    return blake3Hash.hash(data).toString('hex');
  } catch (error) {
    // Fallback to SHA-256 with distinguishing prefix
    return createHash('sha256')
      .update('blake3-fallback:') // Prefix to distinguish from raw SHA256
      .update(data)
      .digest('hex');
  }
}

/**
 * Calculate GID from normalized code
 */
function calculateGID(tile: TileSchema): string {
  if (!tile.code) {
    // For operators without code, use op name
    return blake3(Buffer.from(tile.op, 'utf8'));
  }

  const normalizedCode = toPNF(tile.code);
  return blake3(Buffer.from(normalizedCode, 'utf8'));
}

/**
 * Calculate IID from ABI
 */
function calculateIID(tile: TileSchema): string {
  const abi = {
    types: tile.abi?.types || '',
    effects: tile.abi?.effects || [],
    ports: tile.abi?.ports || tile.ports || {}
  };

  return blake3(canonicalize(abi));
}

/**
 * Calculate XID from GID and neighbor IIDs
 */
function calculateXID(tile: TileSchema, gid: string): string {
  const ports = tile.ports || {};
  const neighborIIDs = tile.neighborIIDs || {};

  if (Object.keys(neighborIIDs).length === 0) {
    // No neighbors, use empty marker
    return blake3(Buffer.from(gid + 'ø', 'utf8'));
  }

  // Sort ports and concatenate with neighbor IIDs
  const sortedPorts = Object.keys(ports).sort();
  const portString = sortedPorts
    .map(port => `${port}|${neighborIIDs[port] || 'ø'}`)
    .join('|');

  return blake3(Buffer.from(gid + portString, 'utf8'));
}

/**
 * Process single tile
 */
function processTile(tile: TileSchema): HashResult & { info: any } {
  const gid = calculateGID(tile);
  const iid = calculateIID(tile);
  const xid = calculateXID(tile, gid);

  const info = {
    op: tile.op,
    ports: tile.ports || {},
    law: tile.law || 'unknown'
  };

  return { gid, iid, xid, info };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  let input: string;

  if (args.length === 0) {
    // Read from stdin
    input = readFileSync(0, 'utf8');
  } else {
    // Read from file
    const filename = args[0];
    input = readFileSync(filename, 'utf8');
  }

  try {
    const tile: TileSchema = parse(input);
    const result = processTile(tile);

    // Output JSON with hashes and minimal info
    console.log(JSON.stringify({
      gid: result.gid,
      iid: result.iid,
      xid: result.xid,
      info: result.info
    }, null, 2));

  } catch (error) {
    console.error('Error processing tile:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { processTile, calculateGID, calculateIID, calculateXID, pnfLite, toPNF };