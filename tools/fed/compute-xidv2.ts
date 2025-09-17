import * as crypto from 'crypto';

// Blake3-style keyed hash (using SHA256 as fallback)
function blake3Keyed(key: string, data: Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(key);
  hash.update(data);
  return hash.digest('hex');
}

// Canonical bytes serialization
export function canonicalBytes(obj: any): Buffer {
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

// Compute Merkle root
function merkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  const sorted = [...hashes].sort();
  if (sorted.length === 1) return sorted[0] || '';

  const hash = crypto.createHash('sha256');
  for (const h of sorted) {
    hash.update(h);
  }
  return hash.digest('hex');
}

// Compute XIDv2
export function computeXIDv2(seed: any, gitRev?: string): string {
  const gid = seed.meta?.gidSet?.[0] || '';
  const iidSet = seed.meta?.iidSet || [];
  const xidSet = seed.meta?.xidSet || [];

  // Canonical NF representation
  const nfCanonical = {
    tiles: seed.tiles || [],
    version: seed.version || 1,
    pl_seed: seed.pl_seed || 'PL-SEED-01',
    name: seed.name || ''
  };

  // Extract route/cost/profile from meta
  const route = seed.meta?.route || { nodes: [], edges: [] };
  const cost = seed.meta?.cost || { lambda: 1, mu: 1, Lbest: 1 };
  const profile = seed.meta?.profile || 'universal';

  const payloadXIDv2 = {
    schema: 'PL-XID-02',
    gid,
    iidRoot: merkleRoot(iidSet),
    xidRoot: merkleRoot(xidSet),
    nfCanonical: canonicalBytes(nfCanonical).toString('base64'),
    route,
    cost,
    profile,
    build: {
      plSpec: 'v0.1',
      toolchain: 'b2',
      gitRev: gitRev || ''
    }
  };

  const canonBytes = canonicalBytes(payloadXIDv2);
  return blake3Keyed('pl:xid:v2', canonBytes);
}