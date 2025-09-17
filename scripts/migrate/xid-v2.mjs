#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

// Get git revision
const gitRev = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

// Blake3-style keyed hash (using SHA256 as fallback)
function blake3Keyed(key, data) {
  const hash = crypto.createHash('sha256');
  hash.update(key);
  hash.update(data);
  return hash.digest('hex');
}

// Canonical bytes serialization
function canonicalBytes(obj) {
  const sorted = JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((result, key) => {
        result[key] = value[key];
        return result;
      }, {});
    }
    return value;
  });
  return Buffer.from(sorted, 'utf8');
}

// Compute Merkle root
function merkleRoot(hashes) {
  if (hashes.length === 0) return '';
  const sorted = [...hashes].sort();
  if (sorted.length === 1) return sorted[0];

  const hash = crypto.createHash('sha256');
  for (const h of sorted) {
    hash.update(h);
  }
  return hash.digest('hex');
}

// Compute XIDv2
function computeXIDv2(seed, gitRev) {
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
      gitRev
    }
  };

  const canonBytes = canonicalBytes(payloadXIDv2);
  return blake3Keyed('pl:xid:v2', canonBytes);
}

// Main migration
console.log('🔄 Migrating to XIDv2...\n');

// Load manifest
const manifestPath = 'dist/fed/manifest.json';
if (!existsSync(manifestPath)) {
  console.error('❌ Manifest not found. Run "make fed-garden" first.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// Process seeds
const updatedSeeds = [];
const xidV2Map = new Map(); // XIDv2 -> seeds mapping
const families = {}; // GID -> family members

for (const seed of manifest.seeds) {
  const xidV1 = seed.xid || null;
  const xidV2 = computeXIDv2(seed, gitRev);

  // Update seed
  seed.xidV1 = xidV1;
  seed.xidV2 = xidV2;

  console.log(`📦 ${seed.name}:`);
  console.log(`   XIDv1: ${xidV1 || 'null'}`);
  console.log(`   XIDv2: ${xidV2}`);

  // Track XIDv2 collisions
  if (!xidV2Map.has(xidV2)) {
    xidV2Map.set(xidV2, []);
  }
  xidV2Map.get(xidV2).push(seed);

  // Build GID families
  const gid = seed.gidSet?.[0];
  if (gid) {
    if (!families[gid]) {
      families[gid] = {
        gid,
        members: []
      };
    }
    families[gid].members.push({
      name: seed.name,
      hash: seed.hash,
      xidV1,
      xidV2
    });
  }

  updatedSeeds.push(seed);
}

// Process quarantine items
const resolvedQuarantine = [];
const remainingQuarantine = [];

console.log('\n🔍 Processing quarantine items...');

for (const item of manifest.quarantine || []) {
  // Load the conflict diff to get both seeds
  if (item.diffFile && existsSync(item.diffFile)) {
    const diff = JSON.parse(readFileSync(item.diffFile, 'utf8'));

    // Compute XIDv2 for both
    const existingSeed = diff.existing;
    const currentSeed = diff.current;

    // Create minimal seed structures for XIDv2 computation
    const existingXIDv2 = computeXIDv2({
      name: existingSeed.name || '',
      tiles: JSON.parse(existingSeed.canonicalJson || '{}').tiles || [],
      meta: JSON.parse(existingSeed.canonicalJson || '{}').meta || {},
      version: 1,
      pl_seed: 'PL-SEED-01'
    }, gitRev);

    const currentXIDv2 = computeXIDv2({
      name: currentSeed.name || '',
      tiles: JSON.parse(currentSeed.canonicalJson || '{}').tiles || [],
      meta: JSON.parse(currentSeed.canonicalJson || '{}').meta || {},
      version: 1,
      pl_seed: 'PL-SEED-01'
    }, gitRev);

    console.log(`\n   Conflict: ${item.gid}`);
    console.log(`   ${existingSeed.name} XIDv2: ${existingXIDv2}`);
    console.log(`   ${currentSeed.name} XIDv2: ${currentXIDv2}`);

    if (existingXIDv2 !== currentXIDv2) {
      // Different XIDv2 = different family members, not a conflict
      console.log(`   ✅ Resolved: Different XIDv2, moving to family`);
      resolvedQuarantine.push(item);
    } else {
      // Same XIDv2 = true alias or conflict
      console.log(`   ⚠️  Same XIDv2: alias or true conflict`);
      remainingQuarantine.push(item);
    }
  } else {
    remainingQuarantine.push(item);
  }
}

// Update manifest
manifest.seeds = updatedSeeds;
manifest.families = families;
manifest.quarantine = remainingQuarantine;

// Add XIDv2 migration metadata
manifest.migration = {
  xidV2: {
    migratedAt: new Date().toISOString(),
    gitRev,
    resolved: resolvedQuarantine.length,
    remaining: remainingQuarantine.length
  }
};

// Save updated manifest
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('\n✅ XIDv2 migration complete!');
console.log(`   Seeds migrated: ${updatedSeeds.length}`);
console.log(`   Quarantine resolved: ${resolvedQuarantine.length}`);
console.log(`   Quarantine remaining: ${remainingQuarantine.length}`);
console.log(`   XIDv2 unique: ${xidV2Map.size}`);

// Report any XIDv2 collisions (aliases)
let aliasCount = 0;
for (const [xidV2, seeds] of xidV2Map) {
  if (seeds.length > 1) {
    console.log(`\n⚠️  XIDv2 collision (aliases): ${xidV2}`);
    for (const seed of seeds) {
      console.log(`   - ${seed.name}`);
    }
    aliasCount++;
  }
}

if (aliasCount > 0) {
  console.log(`\n⚠️  Found ${aliasCount} XIDv2 collisions (potential aliases)`);
}

console.log('\n📝 Manifest updated: dist/fed/manifest.json');