#!/usr/bin/env node

/**
 * Telemetry without telemetry - field receipts collection
 * Privacy-first, opt-in only, no PII
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

function collectFieldTelemetry() {
  console.log('📊 Field Telemetry Collection (Privacy-First)');
  console.log('=' .repeat(40));

  // Generate demo field receipts for testing
  const demoReceipts = [];
  const actions = ['verify', 'bench', 'contribute'];
  const devices = ['browser', 'mobile', 'kiosk'];

  for (let i = 0; i < 5; i++) {
    const receipt = {
      schema: 'PL-FIELD-01',
      version: '1.0.0',
      ts: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      seedGID: crypto.randomBytes(32).toString('hex'),
      seedXIDv2: crypto.randomBytes(32).toString('hex'),
      action: actions[Math.floor(Math.random() * actions.length)],
      runs: Math.ceil(Math.random() * 3),
      deviceHint: devices[Math.floor(Math.random() * devices.length)],
      subjectHash: crypto.randomBytes(32).toString('hex'),
      signer: {
        did: `did:plc:ephemeral-${Date.now()}-${i}`,
        pub: `ed25519:base64:${crypto.randomBytes(32).toString('base64')}`
      },
      sig: crypto.randomBytes(64).toString('base64')
    };
    demoReceipts.push(receipt);
  }

  // Save to output directory
  const outDir = path.join(projectRoot, 'out', 'field');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let saved = 0;
  for (const receipt of demoReceipts) {
    const filename = `field-${Date.now()}-${saved}.json`;
    const filepath = path.join(outDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(receipt, null, 2));
    saved++;
  }

  console.log(`✅ Generated ${saved} demo field receipts`);
  console.log(`   Output: ${outDir}`);

  // Stats summary
  const stats = {
    total: demoReceipts.length,
    actions: {},
    devices: {}
  };

  for (const receipt of demoReceipts) {
    stats.actions[receipt.action] = (stats.actions[receipt.action] || 0) + 1;
    stats.devices[receipt.deviceHint] = (stats.devices[receipt.deviceHint] || 0) + 1;
  }

  console.log('\n📈 Demo Stats:');
  console.log(`   Actions: ${JSON.stringify(stats.actions)}`);
  console.log(`   Devices: ${JSON.stringify(stats.devices)}`);

  return stats;
}

// Auto-collect every 6 hours
function startAutoCollection() {
  console.log('🔄 Starting auto-collection (every 6h)...');

  // Initial collection
  collectFieldTelemetry();

  // Schedule periodic collection
  setInterval(() => {
    console.log(`\n[${new Date().toISOString()}] Auto-collecting...`);
    collectFieldTelemetry();
  }, 6 * 60 * 60 * 1000); // 6 hours
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.includes('--auto')) {
    startAutoCollection();
  } else {
    collectFieldTelemetry();
  }
}

export { collectFieldTelemetry };