#!/usr/bin/env node
// Test PL-SEED-01 conformance

import { readFileSync, readdirSync } from 'fs';

// Simple seed validation function
function validateSeed(seed) {
  if (!seed || typeof seed !== 'object') {
    throw new Error('Seed must be an object');
  }

  if (!seed.nodes || typeof seed.nodes !== 'object') {
    throw new Error('Seed must have nodes object');
  }

  if (!seed.root) {
    throw new Error('Seed must have root');
  }

  if (!seed.name) {
    throw new Error('Seed must have name');
  }

  if (!seed.gidSet || !Array.isArray(seed.gidSet)) {
    throw new Error('Seed must have gidSet array');
  }

  if (!seed.iidSet || !Array.isArray(seed.iidSet)) {
    throw new Error('Seed must have iidSet array');
  }

  // Validate nodes have required fields
  for (const [nodeId, node] of Object.entries(seed.nodes)) {
    if (node.gid && node.iid && node.xid) {
      // This is an operon node
      if (!node.op) {
        throw new Error(`Node ${nodeId} must have op field`);
      }
    } else if (node.oids && node.root) {
      // This is a container node
      continue;
    } else {
      throw new Error(`Node ${nodeId} has invalid structure`);
    }
  }

  return true;
}

let passed = 0;
let failed = 0;

// Test all seeds (skip index files)
const seedFiles = [
  ...readdirSync('seeds').filter(f => f.endsWith('.json') && !f.includes('index')).map(f => `seeds/${f}`),
  ...readdirSync('seeds/examples').filter(f => f.endsWith('.json') && !f.includes('index')).map(f => `seeds/examples/${f}`)
];

for (const file of seedFiles) {
  try {
    const content = JSON.parse(readFileSync(file, 'utf8'));
    validateSeed(content);
    console.log(`✅ ${file}`);
    passed++;
  } catch (e) {
    console.error(`❌ ${file}: ${e.message}`);
    failed++;
  }
}

console.log(`\nConformance: ${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);