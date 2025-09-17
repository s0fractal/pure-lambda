#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * DSSE Chain Management Script
 *
 * Adds "chain": [{keyId, createdAt}] to each DSSE envelope
 * Maintains cryptographic chain of trust for key rotation
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import nacl from 'tweetnacl';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Configuration
const config = {
  dsseDir: path.join(projectRoot, 'dsse'),
  chainFile: path.join(projectRoot, 'docs', 'keys', 'chain.json'),
  secretKeyFile: path.join(projectRoot, '.secrets', 'signing-key.json')
};

class DSSEChainManager {
  constructor() {
    this.chain = this.loadChain();
    this.currentKey = this.loadCurrentKey();
  }

  loadChain() {
    try {
      if (fs.existsSync(config.chainFile)) {
        return JSON.parse(fs.readFileSync(config.chainFile, 'utf8'));
      }
    } catch (error) {
      console.warn('⚠️  Failed to load existing chain:', error.message);
    }

    return {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      keys: []
    };
  }

  loadCurrentKey() {
    try {
      if (fs.existsSync(config.secretKeyFile)) {
        return JSON.parse(fs.readFileSync(config.secretKeyFile, 'utf8'));
      }
    } catch (error) {
      console.error('❌ Failed to load current signing key:', error.message);
      process.exit(1);
    }

    console.error('❌ No signing key found. Run key-rotate.mjs first.');
    process.exit(1);
  }

  updateChain() {
    const keyEntry = {
      keyId: this.currentKey.keyId,
      createdAt: this.currentKey.createdAt,
      publicKey: Buffer.from(this.currentKey.publicKey).toString('hex'),
      algorithm: 'ed25519'
    };

    // Check if key is already in chain
    const existingIndex = this.chain.keys.findIndex(k => k.keyId === keyEntry.keyId);
    if (existingIndex === -1) {
      this.chain.keys.push(keyEntry);
      this.chain.updatedAt = new Date().toISOString();
      console.log(`🔗 Added key ${keyEntry.keyId} to chain`);
    } else {
      console.log(`✓ Key ${keyEntry.keyId} already in chain`);
    }

    // Save updated chain
    fs.mkdirSync(path.dirname(config.chainFile), { recursive: true });
    fs.writeFileSync(config.chainFile, JSON.stringify(this.chain, null, 2));
  }

  getChainForEnvelope() {
    return this.chain.keys.map(key => ({
      keyId: key.keyId,
      createdAt: key.createdAt
    }));
  }

  updateEnvelope(envelopePath) {
    try {
      const envelopeContent = fs.readFileSync(envelopePath, 'utf8');
      const envelope = JSON.parse(envelopeContent);

      // Add chain to envelope
      envelope.chain = this.getChainForEnvelope();
      envelope.chainUpdatedAt = new Date().toISOString();

      // Write updated envelope
      fs.writeFileSync(envelopePath, JSON.stringify(envelope, null, 2));

      return { success: true, chain: envelope.chain };
    } catch (error) {
      console.error(`❌ Failed to update envelope ${envelopePath}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  findAllEnvelopes() {
    const envelopes = [];

    function findEnvelopesRecursively(dir) {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          findEnvelopesRecursively(fullPath);
        } else if (entry.endsWith('.envelope.json')) {
          envelopes.push(fullPath);
        }
      }
    }

    findEnvelopesRecursively(config.dsseDir);
    return envelopes;
  }

  processAllEnvelopes() {
    console.log('🔗 Starting DSSE chain update...\n');

    // Update chain with current key
    this.updateChain();

    // Find all envelope files
    const envelopePaths = this.findAllEnvelopes();

    if (envelopePaths.length === 0) {
      console.log('📝 No DSSE envelopes found');
      return { processed: 0, success: 0, failed: 0 };
    }

    console.log(`📋 Found ${envelopePaths.length} DSSE envelopes to update`);

    const results = [];
    let successCount = 0;

    for (const envelopePath of envelopePaths) {
      const relativePath = path.relative(projectRoot, envelopePath);
      console.log(`🔄 Processing ${relativePath}...`);

      const result = this.updateEnvelope(envelopePath);
      result.path = relativePath;
      results.push(result);

      if (result.success) {
        successCount++;
        console.log(`✅ Updated ${relativePath} (${result.chain.length} keys in chain)`);
      } else {
        console.log(`❌ Failed ${relativePath}: ${result.error}`);
      }
    }

    // Summary
    console.log(`\n📊 Chain Update Summary:`);
    console.log(`   Envelopes processed: ${envelopePaths.length}`);
    console.log(`   Successfully updated: ${successCount}`);
    console.log(`   Failed: ${envelopePaths.length - successCount}`);
    console.log(`   Keys in chain: ${this.chain.keys.length}`);

    if (successCount === envelopePaths.length) {
      console.log('\n🎉 All envelopes successfully updated with chain!');
    } else {
      console.log('\n⚠️  Some envelopes failed to update');
    }

    return {
      processed: envelopePaths.length,
      success: successCount,
      failed: envelopePaths.length - successCount,
      chainLength: this.chain.keys.length
    };
  }

  verifyChain() {
    console.log('🔍 Verifying DSSE chain integrity...\n');

    if (this.chain.keys.length === 0) {
      console.log('❌ Chain is empty');
      return false;
    }

    // Check key uniqueness
    const keyIds = this.chain.keys.map(k => k.keyId);
    const uniqueKeyIds = [...new Set(keyIds)];
    if (keyIds.length !== uniqueKeyIds.length) {
      console.log('❌ Chain contains duplicate key IDs');
      return false;
    }

    // Check chronological order
    const timestamps = this.chain.keys.map(k => new Date(k.createdAt).getTime());
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
    const isChronological = timestamps.every((t, i) => t === sortedTimestamps[i]);

    if (!isChronological) {
      console.log('⚠️  Chain keys are not in chronological order');
    }

    // Display chain
    console.log('🔗 Chain contents:');
    this.chain.keys.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key.keyId} (${key.createdAt})`);
    });

    console.log(`\n✅ Chain verification completed (${this.chain.keys.length} keys)`);
    return true;
  }
}

// Command line interface
function printHelp() {
  console.log('DSSE Chain Management Tool');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/attest/chain.mjs [command] [options]');
  console.log('');
  console.log('Commands:');
  console.log('  update              Update all envelopes with chain (default)');
  console.log('  verify              Verify chain integrity');
  console.log('  show                Show current chain');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h          Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/attest/chain.mjs');
  console.log('  node scripts/attest/chain.mjs update');
  console.log('  node scripts/attest/chain.mjs verify');
  console.log('  node scripts/attest/chain.mjs show');
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const command = args[0] || 'update';

  try {
    const chainManager = new DSSEChainManager();

    switch (command) {
      case 'update':
        const result = chainManager.processAllEnvelopes();
        process.exit(result.failed > 0 ? 1 : 0);
        break;

      case 'verify':
        const valid = chainManager.verifyChain();
        process.exit(valid ? 0 : 1);
        break;

      case 'show':
        console.log('🔗 Current DSSE Chain:');
        console.log(JSON.stringify(chainManager.chain, null, 2));
        process.exit(0);
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }

  } catch (error) {
    console.error('💥 Chain management failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}