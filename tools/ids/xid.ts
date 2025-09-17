#!/usr/bin/env ts-node

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Blake3 keyed hash for XIDv2
function blake3Keyed(key: string, data: Buffer): string {
  // Using SHA256 as fallback since blake3 requires external dependency
  // In production, use: import { blake3 } from '@noble/hashes/blake3';
  const hash = createHash('sha256');
  hash.update(key);
  hash.update(data);
  return hash.digest('hex');
}

// Canonical bytes serialization (deterministic JSON)
function canonicalBytes(obj: any): Buffer {
  // Sort keys recursively
  const sorted = JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((result, key) => {
        result[key] = value[key];
        return result;
      }, {} as any);
    }
    return value;
  });
  return Buffer.from(sorted, 'utf8');
}

// Compute Merkle root for a set of hashes
function merkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';

  // Sort for determinism
  const sorted = [...hashes].sort();

  // If single hash, that's the root
  if (sorted.length === 1) return sorted[0];

  // Compute pairwise hashes
  const hash = createHash('sha256');
  for (const h of sorted) {
    hash.update(h);
  }
  return hash.digest('hex');
}

// Compute XIDv2 with domain separation and full canonical representation
export function computeXIDv2(
  seed: any,
  nf: any,
  route: any,
  cost: any,
  profile: string,
  gitRev: string
): string {
  // Extract GID and IID/XID sets
  const gid = seed.meta?.gidSet?.[0] || '';
  const iidSet = seed.meta?.iidSet || [];
  const xidSet = seed.meta?.xidSet || [];

  // Build canonical NF representation
  const nfCanonical = {
    tiles: seed.tiles || [],
    version: seed.version || 1,
    pl_seed: seed.pl_seed || 'PL-SEED-01'
  };

  // Build XIDv2 payload
  const payloadXIDv2 = {
    schema: 'PL-XID-02',
    gid,
    iidRoot: merkleRoot(iidSet),
    xidRoot: merkleRoot(xidSet),
    nfCanonical: canonicalBytes(nfCanonical).toString('base64'),
    route: {
      nodes: route?.nodes || [],
      edges: route?.edges || []
    },
    cost: {
      lambda: cost?.lambda || 0,
      mu: cost?.mu || 0,
      Lbest: cost?.Lbest || 0
    },
    profile: profile || 'universal',
    build: {
      plSpec: 'v0.1',
      toolchain: 'b2',
      gitRev: gitRev || ''
    }
  };

  // Compute XIDv2 with domain separation
  const canonBytes = canonicalBytes(payloadXIDv2);
  return blake3Keyed('pl:xid:v2', canonBytes);
}

// Migration helper: compute XIDv2 for existing seed
export function migrateToXIDv2(seedPath: string, gitRev: string): {
  xidV1: string | null;
  xidV2: string;
} {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  // Extract existing XID (v1)
  const xidV1 = seed.meta?.xidSet?.[0] || null;

  // Extract route/cost/profile from meta or use defaults
  const route = seed.meta?.route || { nodes: [], edges: [] };
  const cost = seed.meta?.cost || { lambda: 1, mu: 1, Lbest: 1 };
  const profile = seed.meta?.profile || 'universal';
  const nf = seed;

  // Compute XIDv2
  const xidV2 = computeXIDv2(seed, nf, route, cost, profile, gitRev);

  return { xidV1, xidV2 };
}

// Export for use in other scripts
export { canonicalBytes, merkleRoot };