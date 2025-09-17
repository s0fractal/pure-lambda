#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * DSSE Key Rotation Script
 *
 * Generates new ed25519 keypair and saves public key to docs/keys/ROOT-PUBKEY.json
 * Embeds in Pocket/PSE for trust verification
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
  keysDir: path.join(projectRoot, 'docs', 'keys'),
  secretKeyFile: path.join(projectRoot, '.secrets', 'signing-key.json'),
  pubKeyFile: path.join(projectRoot, 'docs', 'keys', 'ROOT-PUBKEY.json'),
  keyId: 'pure-lambda-root-2025'
};

class DSSEKeyManager {
  constructor() {
    this.keyId = config.keyId;
    this.createdAt = new Date().toISOString();
  }

  generateNewKeypair() {
    console.log('🔑 Generating new ed25519 keypair...');

    const keypair = nacl.sign.keyPair();
    const secretKey = keypair.secretKey;
    const publicKey = keypair.publicKey;

    return { secretKey, publicKey };
  }

  saveSecretKey(secretKey, publicKey) {
    // Ensure .secrets directory exists
    fs.mkdirSync(path.dirname(config.secretKeyFile), { recursive: true });

    const keyData = {
      keyId: this.keyId,
      createdAt: this.createdAt,
      secretKey: Array.from(secretKey),
      publicKey: Array.from(publicKey),
      algorithm: 'ed25519',
      usage: 'dsse-signing'
    };

    fs.writeFileSync(config.secretKeyFile, JSON.stringify(keyData, null, 2), { mode: 0o600 });
    console.log(`🔐 Secret key saved to ${path.relative(projectRoot, config.secretKeyFile)}`);
  }

  savePublicKey(publicKey) {
    // Ensure docs/keys directory exists
    fs.mkdirSync(config.keysDir, { recursive: true });

    const pubKeyData = {
      keyId: this.keyId,
      createdAt: this.createdAt,
      publicKey: Buffer.from(publicKey).toString('hex'),
      algorithm: 'ed25519',
      usage: 'dsse-verification',
      source: 'pure-lambda-root',
      version: '1.0.0'
    };

    fs.writeFileSync(config.pubKeyFile, JSON.stringify(pubKeyData, null, 2));
    console.log(`📋 Public key saved to ${path.relative(projectRoot, config.pubKeyFile)}`);
  }

  backupExistingKeys() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (fs.existsSync(config.secretKeyFile)) {
      const backupPath = config.secretKeyFile + `.backup-${timestamp}`;
      fs.copyFileSync(config.secretKeyFile, backupPath);
      console.log(`📦 Backed up existing secret key to ${path.basename(backupPath)}`);
    }

    if (fs.existsSync(config.pubKeyFile)) {
      const backupPath = config.pubKeyFile + `.backup-${timestamp}`;
      fs.copyFileSync(config.pubKeyFile, backupPath);
      console.log(`📦 Backed up existing public key to ${path.basename(backupPath)}`);
    }
  }

  generatePocketPSEConfig(publicKey) {
    const pocketConfig = {
      trust: {
        rootKeys: [
          {
            keyId: this.keyId,
            publicKey: Buffer.from(publicKey).toString('hex'),
            algorithm: 'ed25519',
            createdAt: this.createdAt,
            source: 'pure-lambda-root'
          }
        ]
      },
      dsse: {
        verification: {
          enabled: true,
          strictMode: true,
          requiredKeyId: this.keyId
        }
      }
    };

    const configPath = path.join(config.keysDir, 'pocket-pse-config.json');
    fs.writeFileSync(configPath, JSON.stringify(pocketConfig, null, 2));
    console.log(`🏗️  Generated Pocket/PSE config at ${path.relative(projectRoot, configPath)}`);
  }

  rotateKeys() {
    console.log('🔄 Starting DSSE key rotation...\n');

    // Backup existing keys
    this.backupExistingKeys();

    // Generate new keypair
    const { secretKey, publicKey } = this.generateNewKeypair();

    // Save keys
    this.saveSecretKey(secretKey, publicKey);
    this.savePublicKey(publicKey);

    // Generate PSE config
    this.generatePocketPSEConfig(publicKey);

    console.log('\n✅ Key rotation completed successfully!');
    console.log(`📌 Key ID: ${this.keyId}`);
    console.log(`📅 Created: ${this.createdAt}`);
    console.log(`🔗 Public Key (hex): ${Buffer.from(publicKey).toString('hex')}`);

    return {
      keyId: this.keyId,
      createdAt: this.createdAt,
      publicKeyHex: Buffer.from(publicKey).toString('hex')
    };
  }
}

// Command line interface
function printHelp() {
  console.log('DSSE Key Rotation Tool');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/attest/key-rotate.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h          Show this help message');
  console.log('  --key-id <id>       Custom key ID (default: pure-lambda-root-2025)');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/attest/key-rotate.mjs');
  console.log('  node scripts/attest/key-rotate.mjs --key-id my-custom-key');
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Parse custom key ID
  const keyIdIndex = args.indexOf('--key-id');
  if (keyIdIndex !== -1 && keyIdIndex + 1 < args.length) {
    config.keyId = args[keyIdIndex + 1];
  }

  try {
    const keyManager = new DSSEKeyManager();
    const result = keyManager.rotateKeys();
    process.exit(0);
  } catch (error) {
    console.error('💥 Key rotation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}