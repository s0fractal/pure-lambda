#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Key generation and rotation for receipts
 *
 * - If no .secrets/ed25519.secret exists, generate new key (32B hex)
 * - Write secret key to .secrets/ed25519.secret
 * - Print public key for reference
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { randomBytes, createHash } from 'crypto';
import nacl from 'tweetnacl';

const projectRoot = resolve(process.cwd());
const secretsDir = join(projectRoot, '.secrets');
const secretFile = join(secretsDir, 'ed25519.secret');

function log(message) {
    console.log(`🔑 ${message}`);
}

function generateKeyPair() {
    // Generate Ed25519 key pair
    const keyPair = nacl.sign.keyPair();

    // Extract 32-byte secret key (the first 32 bytes of the 64-byte secret key)
    const secretSeed = keyPair.secretKey.slice(0, 32);
    const publicKey = keyPair.publicKey;

    return {
        secretSeed,
        publicKey,
        secretKey: keyPair.secretKey
    };
}

function derivePublicKey(secretSeed) {
    const keyPair = nacl.sign.keyPair.fromSeed(secretSeed);
    return keyPair.publicKey;
}

function keyIdFromPublicKey(publicKey) {
    return createHash('sha256').update(publicKey).digest('hex').slice(0, 16);
}

function formatKey(key, label) {
    const hex = Buffer.from(key).toString('hex');
    const keyId = keyIdFromPublicKey(key);

    log(`${label}:`);
    log(`  Hex: ${hex}`);
    log(`  Key ID: ${keyId}`);
    log(`  Base64: ${Buffer.from(key).toString('base64')}`);
    return hex;
}

function main() {
    log('Ed25519 Key Management');

    // Ensure .secrets directory exists
    if (!existsSync(secretsDir)) {
        mkdirSync(secretsDir, { recursive: true });
        log(`Created secrets directory: ${secretsDir}`);
    }

    // Check if secret key already exists
    if (existsSync(secretFile)) {
        log(`Secret key already exists: ${secretFile}`);

        try {
            // Read existing secret
            const existingSecretHex = readFileSync(secretFile, 'utf8').trim();

            if (!/^[0-9a-fA-F]{64}$/.test(existingSecretHex)) {
                throw new Error('Invalid secret key format (expected 64-char hex)');
            }

            const secretSeed = Buffer.from(existingSecretHex, 'hex');
            const publicKey = derivePublicKey(secretSeed);

            log('Using existing key:');
            formatKey(publicKey, 'Public Key');

            log('');
            log('Environment variable for signing:');
            log(`export PL_ED25519_SECRET=${existingSecretHex}`);

            return;

        } catch (error) {
            log(`Error reading existing secret: ${error.message}`);
            log('Generating new key...');
        }
    }

    // Generate new key pair
    log('Generating new Ed25519 key pair...');

    const { secretSeed, publicKey } = generateKeyPair();
    const secretHex = Buffer.from(secretSeed).toString('hex');

    // Write secret to file
    writeFileSync(secretFile, secretHex, { mode: 0o600 });
    log(`Secret key written to: ${secretFile}`);

    // Display key information
    log('');
    log('🎉 New key pair generated!');
    formatKey(publicKey, 'Public Key');

    log('');
    log('Environment variable for signing:');
    log(`export PL_ED25519_SECRET=${secretHex}`);

    log('');
    log('⚠️  Security Notes:');
    log('  - Keep .secrets/ed25519.secret private and secure');
    log('  - Add .secrets/ to your .gitignore');
    log('  - Back up your secret key securely');
    log('  - Share only the public key for verification');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}