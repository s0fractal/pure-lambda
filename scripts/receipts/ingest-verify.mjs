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
 * Verify an ingest receipt and its DSSE envelope
 */
function verifyIngestReceipt(receiptPath) {
  console.log('🔍 Verifying Ingest Receipt');
  console.log('=' .repeat(40));

  // Read receipt
  if (!fs.existsSync(receiptPath)) {
    console.error(`❌ Receipt not found: ${receiptPath}`);
    return false;
  }

  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  } catch (error) {
    console.error(`❌ Invalid receipt JSON: ${error.message}`);
    return false;
  }

  // Basic validation
  if (receipt.schema !== 'PL-INGEST-RECEIPT-01') {
    console.error(`❌ Invalid schema: ${receipt.schema}`);
    return false;
  }

  console.log('\n📄 Receipt Details:');
  console.log(`   Timestamp: ${receipt.timestamp}`);
  console.log(`   Operator: ${receipt.operator.did}`);
  console.log(`   Seeds Added: ${receipt.seeds_added.length}`);
  console.log(`   Git Rev: ${receipt.gitRev?.slice(0, 8)}...`);

  // Look for corresponding envelope
  const receiptName = path.basename(receiptPath, '.json');
  const envelopePath = path.join(
    projectRoot,
    'receipts',
    'attest',
    `${receiptName}.envelope.json`
  );

  if (!fs.existsSync(envelopePath)) {
    console.warn('\n⚠️ No DSSE envelope found for this receipt');
    console.log(`   Expected: ${envelopePath}`);
    console.log('   Receipt is unsigned');
    return true; // Receipt valid but unsigned
  }

  // Verify DSSE envelope
  console.log('\n🔐 Verifying DSSE envelope...');

  try {
    execSync(
      `node scripts/attest/verify.mjs "${envelopePath}"`,
      {
        cwd: projectRoot,
        stdio: 'inherit'
      }
    );

    console.log('\n✅ Receipt and signature verified successfully');
    return true;

  } catch (error) {
    console.error('\n❌ DSSE verification failed');
    return false;
  }
}

/**
 * Verify all ingest receipts
 */
function verifyAllReceipts() {
  const receiptsDir = path.join(projectRoot, 'receipts', 'ingest');

  if (!fs.existsSync(receiptsDir)) {
    console.log('No receipts directory found');
    return;
  }

  const receiptFiles = fs.readdirSync(receiptsDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (receiptFiles.length === 0) {
    console.log('No receipts found');
    return;
  }

  console.log(`Found ${receiptFiles.length} receipts to verify\n`);

  let verified = 0;
  let unsigned = 0;
  let failed = 0;

  for (const file of receiptFiles) {
    const receiptPath = path.join(receiptsDir, file);
    console.log(`\n📋 Checking: ${file}`);
    console.log('-'.repeat(40));

    const result = verifyIngestReceipt(receiptPath);

    if (result === true) {
      const envelopePath = path.join(
        projectRoot,
        'receipts',
        'attest',
        `${path.basename(file, '.json')}.envelope.json`
      );

      if (fs.existsSync(envelopePath)) {
        verified++;
      } else {
        unsigned++;
      }
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(40));
  console.log('📊 Summary:');
  console.log(`   ✅ Verified (signed): ${verified}`);
  console.log(`   ⚠️ Valid (unsigned): ${unsigned}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total: ${receiptFiles.length}`);

  return failed === 0;
}

// CLI interface
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--all')) {
    // Verify all receipts
    const success = verifyAllReceipts();
    process.exit(success ? 0 : 1);
  }

  if (args.includes('--help')) {
    console.log('Pure Lambda Ingest Receipt Verifier');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/receipts/ingest-verify.mjs [receipt.json]');
    console.log('  node scripts/receipts/ingest-verify.mjs --all');
    console.log('  node scripts/receipts/ingest-verify.mjs --help');
    return;
  }

  // Verify specific receipt
  const receiptPath = args[0];
  const success = verifyIngestReceipt(receiptPath);
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { verifyIngestReceipt, verifyAllReceipts };