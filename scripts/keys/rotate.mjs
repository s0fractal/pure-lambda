#!/usr/bin/env node

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Generate Ed25519 key pair
 */
function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });

  return {
    publicKey: publicKey.toString('base64'),
    privateKey: privateKey.toString('base64'),
    publicKeyHex: publicKey.toString('hex'),
    privateKeyHex: privateKey.toString('hex')
  };
}

/**
 * Generate DID from public key
 */
function generateDID(scope, identifier) {
  const timestamp = Date.now().toString(36);
  return `did:plc:${scope}-${identifier}-${timestamp}`;
}

/**
 * Create DID registry entry
 */
function createDIDEntry(did, publicKey, role, daysValid = 90) {
  const now = new Date();
  const notBefore = now.toISOString();
  const notAfter = new Date(now.getTime() + daysValid * 24 * 60 * 60 * 1000).toISOString();

  return {
    did: did,
    pubkey: `ed25519:base64:${publicKey}`,
    role: role,
    not_before: notBefore,
    not_after: notAfter,
    metadata: {
      created: notBefore,
      rotated: true
    }
  };
}

/**
 * Main rotation function
 */
function rotateKey(options = {}) {
  const scope = options.scope || 'sign:seed';
  const identifier = options.identifier || 'auto';
  const daysValid = options.days || (scope === 'steward' ? 180 : 90);

  console.log('🔐 Pure Lambda Key Rotation');
  console.log('=' .repeat(40));
  console.log(`Scope: ${scope}`);
  console.log(`Days Valid: ${daysValid}`);
  console.log('');

  // Generate new key pair
  console.log('🔑 Generating Ed25519 key pair...');
  const keyPair = generateKeyPair();

  // Generate DID
  const did = generateDID(scope.replace(':', '-'), identifier);
  console.log(`📋 DID: ${did}`);

  // Create registry entry
  const entry = createDIDEntry(did, keyPair.publicKey, scope, daysValid);

  // Display results
  console.log('');
  console.log('📄 Registry Entry (add to registry/dids.json):');
  console.log(JSON.stringify(entry, null, 2));

  console.log('');
  console.log('🔑 Public Key (share this):');
  console.log(`  Base64: ${keyPair.publicKey}`);
  console.log(`  Hex: ${keyPair.publicKeyHex}`);

  console.log('');
  console.log('⚠️ PRIVATE KEY (NEVER COMMIT - SAVE SECURELY):');
  console.log(`  Base64: ${keyPair.privateKey}`);
  console.log(`  Hex: ${keyPair.privateKeyHex}`);

  console.log('');
  console.log('🔒 Security Reminders:');
  console.log('  1. NEVER commit the private key');
  console.log('  2. Store private key in secure key management');
  console.log('  3. Add registry entry to registry/dids.json');
  console.log('  4. Update old key not_after date for overlap period');
  console.log('  5. Test signatures with new key before full rotation');

  // Optionally save to file (NOT the private key)
  if (options.output) {
    const outputData = {
      did: did,
      entry: entry,
      publicKey: keyPair.publicKey,
      // Explicitly NOT including private key
      warning: 'Private key not included - store securely elsewhere'
    };

    const outputPath = path.join(projectRoot, 'out', `rotation-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n💾 Public data saved to: ${outputPath}`);
  }

  return {
    did,
    entry,
    publicKey: keyPair.publicKey
  };
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scope':
        options.scope = args[++i];
        break;
      case '--identifier':
        options.identifier = args[++i];
        break;
      case '--days':
        options.days = parseInt(args[++i]);
        break;
      case '--output':
        options.output = true;
        break;
      case '--help':
        console.log('Pure Lambda Key Rotation Tool');
        console.log('');
        console.log('Usage:');
        console.log('  node scripts/keys/rotate.mjs [options]');
        console.log('');
        console.log('Options:');
        console.log('  --scope <scope>        Key scope (sign:seed, sign:release, steward)');
        console.log('  --identifier <id>      Identifier for DID generation');
        console.log('  --days <n>            Days until expiration (default: 90)');
        console.log('  --output              Save public data to file');
        console.log('  --help               Show this help');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/keys/rotate.mjs --scope sign:seed');
        console.log('  node scripts/keys/rotate.mjs --scope steward --days 180');
        return;
    }
  }

  // Validate scope
  const validScopes = ['sign:seed', 'sign:release', 'steward'];
  if (options.scope && !validScopes.includes(options.scope)) {
    console.error(`❌ Invalid scope: ${options.scope}`);
    console.error(`   Valid scopes: ${validScopes.join(', ')}`);
    process.exit(1);
  }

  rotateKey(options);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { rotateKey, generateKeyPair, generateDID };