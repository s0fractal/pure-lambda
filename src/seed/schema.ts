// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * PL-SEED-01 TypeScript Schema and Validation
 * Manual validation without external dependencies
 */

export interface TileABI {
  types: string;
  effects: string[];
  ports: Record<string, string>;
}

export interface TileObject {
  op: string;
  code?: string;
  abi: TileABI;
  law: string;
  cost: string;
}

export interface SeedMeta {
  gidSet: string[];
  iidSet: string[];
  xidSet: string[];
  stats: {
    hops: number;
    latency: number;
    mem: number;
  };
}

export interface Seed {
  pl_seed: "PL-SEED-01";
  name: string;
  version: number;
  createdAt: string;
  tiles: TileObject[];
  meta: SeedMeta;
}

export interface OperonJson {
  nodes: Record<string, any>;
  root: string;
  name: string;
  gidSet: string[];
  iidSet: string[];
  expected?: {
    minRouteLen: number;
    invariants: string[];
  };
}

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate string field
 */
function validateString(value: any, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string, got ${typeof value}`);
  }
  if (value.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }
  return value;
}

/**
 * Validate number field
 */
function validateNumber(value: any, fieldName: string): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a number, got ${typeof value}`);
  }
  return value;
}

/**
 * Validate positive integer
 */
function validatePositiveInteger(value: any, fieldName: string): number {
  const num = validateNumber(value, fieldName);
  if (!Number.isInteger(num) || num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer, got ${num}`);
  }
  return num;
}

/**
 * Validate ISO 8601 timestamp
 */
function validateISO8601(value: any, fieldName: string): string {
  const str = validateString(value, fieldName);
  const date = new Date(str);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid ISO 8601 timestamp`);
  }
  // Ensure it's in UTC format (ends with Z)
  if (!str.endsWith('Z')) {
    throw new ValidationError(`${fieldName} must be in UTC format (end with Z)`);
  }
  return str;
}

/**
 * Validate array of strings
 */
function validateStringArray(value: any, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array, got ${typeof value}`);
  }
  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new ValidationError(`${fieldName}[${index}] must be a string, got ${typeof item}`);
    }
    return item;
  });
}

/**
 * Validate hex hash string
 */
function validateHexHash(value: any, fieldName: string): string {
  const str = validateString(value, fieldName);
  if (!/^[0-9a-fA-F]+$/.test(str)) {
    throw new ValidationError(`${fieldName} must be a hex string`);
  }
  if (str.length !== 64) {
    throw new ValidationError(`${fieldName} must be 64 characters (32 bytes), got ${str.length}`);
  }
  return str.toLowerCase();
}

/**
 * Validate array of hex hashes
 */
function validateHexHashArray(value: any, fieldName: string): string[] {
  const arr = validateStringArray(value, fieldName);
  return arr.map((hash, index) =>
    validateHexHash(hash, `${fieldName}[${index}]`)
  );
}

/**
 * Validate object with string keys and string values
 */
function validateStringRecord(value: any, fieldName: string): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an object, got ${typeof value}`);
  }

  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof key !== 'string') {
      throw new ValidationError(`${fieldName} keys must be strings`);
    }
    if (typeof val !== 'string') {
      throw new ValidationError(`${fieldName}["${key}"] must be a string, got ${typeof val}`);
    }
    result[key] = val;
  }
  return result;
}

/**
 * Validate seed name format
 */
function validateSeedName(value: any): string {
  const name = validateString(value, 'name');
  if (!/^[a-zA-Z0-9-]+$/.test(name)) {
    throw new ValidationError('name must contain only alphanumeric characters and hyphens');
  }
  if (name.startsWith('-') || name.endsWith('-')) {
    throw new ValidationError('name cannot start or end with hyphen');
  }
  return name;
}

/**
 * Validate TileABI
 */
function validateTileABI(value: any, fieldPath: string): TileABI {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${fieldPath}.abi must be an object`);
  }

  const types = validateString(value.types, `${fieldPath}.abi.types`);
  const effects = validateStringArray(value.effects, `${fieldPath}.abi.effects`);
  const ports = validateStringRecord(value.ports, `${fieldPath}.abi.ports`);

  return { types, effects, ports };
}

/**
 * Validate TileObject
 */
function validateTileObject(value: any, index: number): TileObject {
  const fieldPath = `tiles[${index}]`;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${fieldPath} must be an object`);
  }

  const op = validateString(value.op, `${fieldPath}.op`);
  const code = value.code !== undefined ? validateString(value.code, `${fieldPath}.code`) : undefined;
  const abi = validateTileABI(value.abi, fieldPath);
  const law = validateString(value.law, `${fieldPath}.law`);
  const cost = validateString(value.cost, `${fieldPath}.cost`);

  const result: TileObject = { op, abi, law, cost };
  if (code !== undefined) {
    result.code = code;
  }
  return result;
}

/**
 * Validate SeedMeta
 */
function validateSeedMeta(value: any): SeedMeta {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError('meta must be an object');
  }

  const gidSet = validateHexHashArray(value.gidSet, 'meta.gidSet');
  const iidSet = validateHexHashArray(value.iidSet, 'meta.iidSet');
  const xidSet = validateHexHashArray(value.xidSet, 'meta.xidSet');

  // Validate stats
  if (typeof value.stats !== 'object' || value.stats === null || Array.isArray(value.stats)) {
    throw new ValidationError('meta.stats must be an object');
  }

  const hops = validatePositiveInteger(value.stats.hops, 'meta.stats.hops');
  const latency = validateNumber(value.stats.latency, 'meta.stats.latency');
  const mem = validatePositiveInteger(value.stats.mem, 'meta.stats.mem');

  if (latency < 0) {
    throw new ValidationError('meta.stats.latency must be non-negative');
  }

  return {
    gidSet,
    iidSet,
    xidSet,
    stats: { hops, latency, mem }
  };
}

/**
 * Validate complete Seed object
 */
export function validateSeed(data: any): Seed {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ValidationError('Seed must be an object');
  }

  // Validate pl_seed literal
  if (data.pl_seed !== 'PL-SEED-01') {
    throw new ValidationError(`pl_seed must be "PL-SEED-01", got "${data.pl_seed}"`);
  }

  const pl_seed = data.pl_seed as "PL-SEED-01";
  const name = validateSeedName(data.name);
  const version = validatePositiveInteger(data.version, 'version');
  const createdAt = validateISO8601(data.createdAt, 'createdAt');

  // Validate tiles array
  if (!Array.isArray(data.tiles)) {
    throw new ValidationError('tiles must be an array');
  }
  if (data.tiles.length === 0) {
    throw new ValidationError('tiles array cannot be empty');
  }

  const tiles = data.tiles.map((tile: any, index: number) => validateTileObject(tile, index));
  const meta = validateSeedMeta(data.meta);

  return {
    pl_seed,
    name,
    version,
    createdAt,
    tiles,
    meta
  };
}

/**
 * Create canonical JSON string for hashing
 * - Sort keys alphabetically at all levels
 * - No whitespace
 * - Deterministic number serialization
 * @deprecated Use canonicalize from '../seed/canonical.ts' instead
 */
export function canonicalizeJSON(obj: any): string {
  // Import the new canonical function
  const { canonicalize } = require('./canonical');
  return canonicalize(obj);
}

/**
 * Compute BLAKE3 hash with SHA-256 fallback
 */
export function computeHash(data: string): string {
  const { createHash } = require('crypto');

  try {
    // Try to use BLAKE3 if available
    const blake3Hash = require('blake3');
    return blake3Hash.hash(Buffer.from(data, 'utf8')).toString('hex');
  } catch (error) {
    // Fallback to SHA-256 with distinguishing prefix
    return createHash('sha256')
      .update('blake3-fallback:')
      .update(data, 'utf8')
      .digest('hex');
  }
}