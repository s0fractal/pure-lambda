#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, readFileSync } from 'fs';

console.log('🔄 Federation V2 Reindex Migration...\n');

// Step 1: Clean existing federation
console.log('📦 Cleaning existing federation...');
if (existsSync('dist/fed')) {
  rmSync('dist/fed', { recursive: true, force: true });
  console.log('   ✅ Removed dist/fed');
}
if (existsSync('diagnostics/fed')) {
  rmSync('diagnostics/fed', { recursive: true, force: true });
  console.log('   ✅ Removed diagnostics/fed');
}

// Step 2: Re-ingest garden seeds
console.log('\n🌱 Ingesting garden seeds...');
try {
  const output = execSync('ts-node tools/fed/ingest.ts seeds/garden', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log('   ✅ Garden seeds ingested');
} catch (error) {
  console.error('   ❌ Failed to ingest garden seeds:', error.message);
  process.exit(1);
}

// Step 3: Analyze results
console.log('\n📊 Analysis:');
try {
  const manifest = JSON.parse(readFileSync('dist/fed/manifest.json', 'utf8'));

  console.log(`   Schema: ${manifest.schema || 'v1'}`);
  console.log(`   Seeds: ${manifest.seeds?.length || 0}`);
  console.log(`   Quarantine: ${manifest.quarantine?.length || 0}`);

  // Count families
  const families = manifest.families || {};
  const familyCount = Object.keys(families).length;
  const totalMembers = Object.values(families).reduce((acc, f) => acc + f.members.length, 0);
  console.log(`   Families: ${familyCount} GIDs with ${totalMembers} total members`);

  // Show aliases
  const aliases = [];
  for (const seed of manifest.seeds || []) {
    if (seed.aliases && seed.aliases.length > 1) {
      aliases.push(`${seed.name}: ${seed.aliases.join(', ')}`);
    }
  }
  if (aliases.length > 0) {
    console.log('\n📝 Aliases found:');
    aliases.forEach(a => console.log(`   - ${a}`));
  }

  // Show quarantine reasons
  if (manifest.quarantine && manifest.quarantine.length > 0) {
    console.log('\n⚠️  Quarantine items:');
    const reasons = {};
    for (const item of manifest.quarantine) {
      reasons[item.reason] = (reasons[item.reason] || 0) + 1;
    }
    for (const [reason, count] of Object.entries(reasons)) {
      console.log(`   ${reason}: ${count}`);
    }
  }

  // Summary
  console.log('\n✅ Federation V2 reindex complete!');
  console.log(`   Trust score: ${manifest.trust?.score || 0}`);
  console.log(`   Expected quarantine: 0 (all XIDv2 should differ)`);

  if (manifest.quarantine?.length === 0) {
    console.log('\n🎉 Success! No conflicts with XIDv2.');
  } else {
    console.log('\n⚠️  Still have conflicts. Check diagnostics/fed/ for details.');
  }

} catch (error) {
  console.error('❌ Failed to analyze results:', error.message);
  process.exit(1);
}