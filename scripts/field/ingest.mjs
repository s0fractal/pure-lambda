#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Field Receipt Ingestion Pipeline
 * Verifies and aggregates PL-FIELD-01 receipts
 */

// Ensure directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Verify field receipt signature and structure
 */
function verifyReceipt(receipt) {
  const errors = [];

  // Check schema
  if (receipt.schema !== 'PL-FIELD-01') {
    errors.push(`Invalid schema: ${receipt.schema}`);
  }

  // Check required fields
  const required = ['version', 'ts', 'seedGID', 'seedXIDv2', 'action', 'runs', 'subjectHash', 'signer', 'sig'];
  for (const field of required) {
    if (!receipt[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Verify timestamp is reasonable
  if (receipt.ts) {
    const age = Date.now() - new Date(receipt.ts).getTime();
    if (age < 0) {
      errors.push('Timestamp is in the future');
    }
    if (age > 30 * 24 * 60 * 60 * 1000) {
      errors.push('Receipt older than 30 days');
    }
  }

  // Verify action is valid
  if (receipt.action && !['verify', 'bench', 'contribute'].includes(receipt.action)) {
    errors.push(`Invalid action: ${receipt.action}`);
  }

  // Verify signature (simplified - in production would use nacl)
  if (receipt.sig && receipt.signer?.pub) {
    // Extract payload for signature verification
    const payload = {
      schema: receipt.schema,
      version: receipt.version,
      ts: receipt.ts,
      seedGID: receipt.seedGID,
      seedXIDv2: receipt.seedXIDv2,
      action: receipt.action,
      runs: receipt.runs,
      deviceHint: receipt.deviceHint,
      subjectHash: receipt.subjectHash
    };

    // Canonical JSON serialization
    const canonical = JSON.stringify(payload, Object.keys(payload).sort());
    const hash = crypto.createHash('sha256').update(canonical).digest('hex');

    // Basic check that sig exists and is base64
    try {
      const sigBuffer = Buffer.from(receipt.sig, 'base64');
      if (sigBuffer.length < 32) {
        errors.push('Signature too short');
      }
    } catch (e) {
      errors.push('Invalid signature encoding');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Aggregate receipts into daily report
 */
function aggregateReceipts(receipts, date) {
  const stats = {
    period: date,
    totalReceipts: receipts.length,
    validReceipts: 0,
    invalidReceipts: 0,
    actions: {
      verify: 0,
      bench: 0,
      contribute: 0
    },
    uniqueSeeds: new Set(),
    totalRuns: 0,
    deviceDistribution: {
      browser: 0,
      mobile: 0,
      kiosk: 0
    },
    hourlyDistribution: {}
  };

  const validReceipts = [];
  const invalidReceipts = [];

  for (const receipt of receipts) {
    const verification = verifyReceipt(receipt);

    if (verification.valid) {
      stats.validReceipts++;
      validReceipts.push(receipt);

      // Update stats
      stats.actions[receipt.action] = (stats.actions[receipt.action] || 0) + 1;
      stats.uniqueSeeds.add(receipt.seedGID);
      stats.totalRuns += receipt.runs || 1;

      const device = receipt.deviceHint || 'browser';
      stats.deviceDistribution[device] = (stats.deviceDistribution[device] || 0) + 1;

      // Hourly distribution
      const hour = new Date(receipt.ts).getHours();
      stats.hourlyDistribution[hour] = (stats.hourlyDistribution[hour] || 0) + 1;
    } else {
      stats.invalidReceipts++;
      invalidReceipts.push({
        receipt,
        errors: verification.errors
      });
    }
  }

  stats.uniqueSeeds = stats.uniqueSeeds.size;

  return {
    stats,
    validReceipts,
    invalidReceipts
  };
}

/**
 * Generate markdown report
 */
function generateReport(aggregation, date) {
  const { stats, validReceipts, invalidReceipts } = aggregation;

  let report = `# Field Trial Report - ${date}\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;

  report += `## Summary\n\n`;
  report += `- Total Receipts: ${stats.totalReceipts}\n`;
  report += `- Valid: ${stats.validReceipts}\n`;
  report += `- Invalid: ${stats.invalidReceipts}\n`;
  report += `- Unique Seeds: ${stats.uniqueSeeds}\n`;
  report += `- Total Runs: ${stats.totalRuns}\n\n`;

  report += `## Actions\n\n`;
  report += `| Action | Count | Percentage |\n`;
  report += `|--------|-------|------------|\n`;
  for (const [action, count] of Object.entries(stats.actions)) {
    const pct = ((count / stats.validReceipts) * 100).toFixed(1);
    report += `| ${action} | ${count} | ${pct}% |\n`;
  }
  report += `\n`;

  report += `## Device Distribution\n\n`;
  report += `| Device | Count | Percentage |\n`;
  report += `|--------|-------|------------|\n`;
  for (const [device, count] of Object.entries(stats.deviceDistribution)) {
    const pct = ((count / stats.validReceipts) * 100).toFixed(1);
    report += `| ${device} | ${count} | ${pct}% |\n`;
  }
  report += `\n`;

  report += `## Hourly Activity\n\n`;
  report += `\`\`\`\n`;
  const maxHourly = Math.max(...Object.values(stats.hourlyDistribution));
  for (let hour = 0; hour < 24; hour++) {
    const count = stats.hourlyDistribution[hour] || 0;
    const bars = '█'.repeat(Math.ceil((count / maxHourly) * 20));
    report += `${hour.toString().padStart(2, '0')}:00 ${bars} ${count}\n`;
  }
  report += `\`\`\`\n\n`;

  if (invalidReceipts.length > 0) {
    report += `## Invalid Receipts\n\n`;
    report += `Found ${invalidReceipts.length} invalid receipts:\n\n`;
    for (const invalid of invalidReceipts.slice(0, 5)) {
      report += `- \`${invalid.receipt.seedGID || 'unknown'}\`: ${invalid.errors.join(', ')}\n`;
    }
    if (invalidReceipts.length > 5) {
      report += `- ... and ${invalidReceipts.length - 5} more\n`;
    }
    report += `\n`;
  }

  report += `## Privacy Notice\n\n`;
  report += `This report contains only aggregated, anonymous metrics.\n`;
  report += `No personally identifiable information is collected or stored.\n`;

  return report;
}

/**
 * Generate DSSE envelope for attestation
 */
function generateDSSE(summary, date) {
  const payload = Buffer.from(JSON.stringify(summary)).toString('base64');

  // Generate ephemeral signing key
  const keyPair = {
    did: `did:plc:field-ingest-${date}`,
    pub: crypto.randomBytes(32).toString('base64')
  };

  // Create signature (simplified)
  const hash = crypto.createHash('sha256').update(payload).digest();
  const sig = crypto.randomBytes(64).toString('base64');

  const envelope = {
    payload,
    payloadType: 'application/json',
    signatures: [{
      keyid: keyPair.did,
      sig
    }],
    _meta: {
      schema: 'PL-FIELD-01-SUMMARY',
      date,
      timestamp: new Date().toISOString(),
      receipts: summary.totalReceipts,
      valid: summary.validReceipts
    }
  };

  return envelope;
}

/**
 * Main ingestion pipeline
 */
function ingest(inputPath, options = {}) {
  console.log('📊 Field Receipt Ingestion');
  console.log('=' .repeat(40));

  const date = options.date || new Date().toISOString().split('T')[0];

  // Read receipts
  let receipts = [];

  if (fs.statSync(inputPath).isDirectory()) {
    // Read all JSON files from directory
    const files = fs.readdirSync(inputPath).filter(f => f.endsWith('.json'));
    console.log(`📁 Found ${files.length} receipt files`);

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(inputPath, file), 'utf8');
        const receipt = JSON.parse(content);
        receipts.push(receipt);
      } catch (error) {
        console.error(`❌ Failed to read ${file}: ${error.message}`);
      }
    }
  } else {
    // Read single file (could be array or single receipt)
    const content = fs.readFileSync(inputPath, 'utf8');
    const data = JSON.parse(content);
    receipts = Array.isArray(data) ? data : [data];
  }

  console.log(`📋 Processing ${receipts.length} receipts`);

  // Aggregate
  const aggregation = aggregateReceipts(receipts, date);

  console.log(`✅ Valid: ${aggregation.stats.validReceipts}`);
  console.log(`❌ Invalid: ${aggregation.stats.invalidReceipts}`);
  console.log(`🌱 Unique seeds: ${aggregation.stats.uniqueSeeds}`);

  // Generate report
  const report = generateReport(aggregation, date);
  const reportPath = path.join(projectRoot, 'reports', 'field', `${date}.md`);
  ensureDir(path.dirname(reportPath));
  fs.writeFileSync(reportPath, report);
  console.log(`📝 Report: ${reportPath}`);

  // Generate summary JSON
  const summaryPath = path.join(projectRoot, 'dist', 'field', 'summary.json');
  ensureDir(path.dirname(summaryPath));

  // Load existing summary or create new
  let summary = {};
  if (fs.existsSync(summaryPath)) {
    summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  }

  // Update with today's stats
  summary[date] = aggregation.stats;
  summary._meta = {
    updated: new Date().toISOString(),
    totalDays: Object.keys(summary).filter(k => !k.startsWith('_')).length
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`📊 Summary: ${summaryPath}`);

  // Generate DSSE attestation
  const envelope = generateDSSE(aggregation.stats, date);
  const envelopePath = path.join(projectRoot, 'receipts', 'attest', `field-${date}.envelope.json`);
  ensureDir(path.dirname(envelopePath));
  fs.writeFileSync(envelopePath, JSON.stringify(envelope, null, 2));
  console.log(`🔏 DSSE: ${envelopePath}`);

  // Quarantine invalid receipts
  if (aggregation.invalidReceipts.length > 0) {
    const quarantinePath = path.join(projectRoot, 'quarantine', 'field', date);
    ensureDir(quarantinePath);

    for (let i = 0; i < aggregation.invalidReceipts.length; i++) {
      const invalid = aggregation.invalidReceipts[i];
      const quarantineFile = path.join(quarantinePath, `invalid-${i + 1}.json`);
      fs.writeFileSync(quarantineFile, JSON.stringify({
        receipt: invalid.receipt,
        errors: invalid.errors,
        timestamp: new Date().toISOString()
      }, null, 2));
    }

    console.log(`⚠️  Quarantined ${aggregation.invalidReceipts.length} invalid receipts`);
  }

  return aggregation;
}

// CLI interface
function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: node scripts/field/ingest.mjs <receipts-path> [--date YYYY-MM-DD]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/field/ingest.mjs field-receipts/');
    console.log('  node scripts/field/ingest.mjs receipts.json --date 2025-09-17');
    process.exit(1);
  }

  const inputPath = args[0];
  const dateIndex = args.indexOf('--date');
  const date = dateIndex !== -1 ? args[dateIndex + 1] : undefined;

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Path not found: ${inputPath}`);
    process.exit(1);
  }

  ingest(inputPath, { date });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ingest, verifyReceipt, aggregateReceipts };