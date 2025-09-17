#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Get current git revision
 */
function getGitRev() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: projectRoot }).trim();
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Collect ingest statistics
 */
function collectIngestStats() {
  const manifestPath = path.join(projectRoot, 'observability', 'manifest-v2.json');

  if (!fs.existsSync(manifestPath)) {
    return {
      total_seeds: 0,
      trust_avg: 0,
      dsse_count: 0,
      conformance_avg: 0
    };
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const seeds = Object.values(manifest.seeds || {});

    const stats = {
      total_seeds: seeds.length,
      trust_avg: 0,
      dsse_count: 0,
      conformance_avg: 0
    };

    if (seeds.length > 0) {
      const trustScores = seeds
        .map(s => s.trust?.score || 0)
        .filter(s => s > 0);

      stats.trust_avg = trustScores.length > 0
        ? (trustScores.reduce((a, b) => a + b, 0) / trustScores.length).toFixed(3)
        : 0;

      stats.dsse_count = seeds.filter(s => s.dsse?.valid).length;

      const conformanceScores = seeds
        .map(s => s.conformance?.score || 0)
        .filter(s => s > 0);

      stats.conformance_avg = conformanceScores.length > 0
        ? (conformanceScores.reduce((a, b) => a + b, 0) / conformanceScores.length).toFixed(3)
        : 0;
    }

    return stats;

  } catch (error) {
    console.warn('Failed to collect stats:', error.message);
    return {
      total_seeds: 0,
      trust_avg: 0,
      dsse_count: 0,
      conformance_avg: 0
    };
  }
}

/**
 * Create ingest receipt
 */
function createIngestReceipt(seedsAdded = []) {
  const timestamp = new Date().toISOString();
  const gitRev = getGitRev();
  const stats = collectIngestStats();

  // Get operator DID (from env or default)
  const operatorDID = process.env.PL_OPERATOR_DID || 'did:plc:operator-local';

  const receipt = {
    schema: 'PL-INGEST-RECEIPT-01',
    timestamp: timestamp,
    operator: {
      did: operatorDID,
      action: 'ingest'
    },
    seeds_added: seedsAdded.map(seed => ({
      gid: seed.gid || seed.meta?.gidSet?.[0] || 'unknown',
      xidv2: seed.xidv2 || seed.meta?.xidV2 || 'unknown',
      name: seed.name,
      size: seed.size || 0
    })),
    stats: {
      trust: parseFloat(stats.trust_avg),
      dsse: stats.dsse_count,
      conformance: parseFloat(stats.conformance_avg),
      total: stats.total_seeds
    },
    gitRev: gitRev,
    environment: {
      node: process.version,
      platform: process.platform
    }
  };

  return receipt;
}

/**
 * Save receipt to file
 */
function saveReceipt(receipt) {
  const receiptsDir = path.join(projectRoot, 'receipts', 'ingest');

  // Ensure directory exists
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true });
  }

  // Generate filename
  const timestamp = receipt.timestamp.replace(/[:.]/g, '-');
  const filename = `ingest-${timestamp}.json`;
  const filepath = path.join(receiptsDir, filename);

  // Save receipt
  fs.writeFileSync(filepath, JSON.stringify(receipt, null, 2));

  console.log(`✅ Receipt saved: ${filepath}`);
  return filepath;
}

/**
 * Sign receipt with DSSE
 */
async function signReceipt(receiptPath) {
  const attestDir = path.join(projectRoot, 'receipts', 'attest');

  // Ensure attest directory exists
  if (!fs.existsSync(attestDir)) {
    fs.mkdirSync(attestDir, { recursive: true });
  }

  // Generate envelope filename
  const receiptName = path.basename(receiptPath, '.json');
  const envelopePath = path.join(attestDir, `${receiptName}.envelope.json`);

  try {
    // Use the attest/build script to sign
    console.log('🔐 Signing receipt with DSSE...');

    execSync(
      `node scripts/attest/build.mjs "${receiptPath}" "${envelopePath}"`,
      {
        cwd: projectRoot,
        stdio: 'inherit'
      }
    );

    console.log(`✅ Signed envelope: ${envelopePath}`);
    return envelopePath;

  } catch (error) {
    console.error('❌ Failed to sign receipt:', error.message);
    console.log('   Make sure PL_ED25519_SECRET is set');
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  console.log('📋 Creating Ingest Receipt');
  console.log('=' .repeat(40));

  // Collect seeds that were added (simplified for demo)
  const seedsAdded = [];

  // Check if we have recent seeds to include
  const seedsDir = path.join(projectRoot, 'seeds', 'garden');
  if (fs.existsSync(seedsDir)) {
    const seedFiles = fs.readdirSync(seedsDir)
      .filter(f => f.endsWith('.json'))
      .slice(0, 3); // Take first 3 for demo

    for (const file of seedFiles) {
      try {
        const content = fs.readFileSync(path.join(seedsDir, file), 'utf8');
        const seed = JSON.parse(content);
        seedsAdded.push({
          name: seed.name || file.replace('.json', ''),
          size: content.length
        });
      } catch (error) {
        // Skip invalid seeds
      }
    }
  }

  // Create receipt
  const receipt = createIngestReceipt(seedsAdded);

  console.log('\n📄 Receipt Summary:');
  console.log(`   Timestamp: ${receipt.timestamp}`);
  console.log(`   Operator: ${receipt.operator.did}`);
  console.log(`   Seeds Added: ${receipt.seeds_added.length}`);
  console.log(`   Git Rev: ${receipt.gitRev.slice(0, 8)}...`);

  // Save receipt
  const receiptPath = saveReceipt(receipt);

  // Sign if secret is available
  if (process.env.PL_ED25519_SECRET) {
    await signReceipt(receiptPath);
  } else {
    console.log('\n⚠️ PL_ED25519_SECRET not set - receipt not signed');
    console.log('   To sign: export PL_ED25519_SECRET=<32-byte-hex>');
  }

  console.log('\n✅ Ingest receipt complete');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Failed to create receipt:', error.message);
    process.exit(1);
  });
}

export { createIngestReceipt, saveReceipt };