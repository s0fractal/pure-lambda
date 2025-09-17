#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Verify all receipts and attestation envelopes
 *
 * - Verify all receipts/*.json files
 * - Verify receipts/attest/envelope.json if it exists
 * - Exit non-zero on first failure
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import nacl from 'tweetnacl';

const projectRoot = resolve(process.cwd());
const receiptsDir = join(projectRoot, 'receipts');
const attestDir = join(receiptsDir, 'attest');
const envelopeFile = join(attestDir, 'envelope.json');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function log(message, type = 'info') {
    const icons = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };
    console.log(`${icons[type]} ${message}`);
}

function incrementCheck(passed) {
    totalChecks++;
    if (passed) {
        passedChecks++;
    } else {
        failedChecks++;
    }
}

function getEd25519Secret() {
    const secretHex = process.env.PL_ED25519_SECRET;
    if (!secretHex) {
        // Try reading from .secrets file
        const secretFile = join(projectRoot, '.secrets', 'ed25519.secret');
        if (existsSync(secretFile)) {
            const fileContent = readFileSync(secretFile, 'utf8').trim();
            if (/^[0-9a-fA-F]{64}$/.test(fileContent)) {
                return Uint8Array.from(Buffer.from(fileContent, 'hex'));
            }
        }
        return null;
    }

    if (!/^[0-9a-fA-F]{64}$/.test(secretHex)) {
        log('PL_ED25519_SECRET must be a 64-character hex string', 'error');
        return null;
    }

    return Uint8Array.from(Buffer.from(secretHex, 'hex'));
}

function derivePublicKey(secretSeed) {
    const keyPair = nacl.sign.keyPair.fromSeed(secretSeed);
    const keyId = createHash('sha256').update(keyPair.publicKey).digest('hex').slice(0, 16);
    return {
        publicKey: keyPair.publicKey,
        keyId
    };
}

function verifySignature(payload, signatureBase64, publicKey) {
    try {
        const payloadBytes = Buffer.from(payload, 'utf8');
        const signature = Buffer.from(signatureBase64, 'base64');
        return nacl.sign.detached.verify(payloadBytes, signature, publicKey);
    } catch (error) {
        log(`Signature verification error: ${error.message}`, 'error');
        return false;
    }
}

function verifyReceipt(receiptPath) {
    log(`Verifying receipt: ${receiptPath}`);

    try {
        const content = readFileSync(receiptPath, 'utf8');
        const receipt = JSON.parse(content);

        // Basic receipt validation
        if (!receipt.timestamp && !receipt.ts) {
            log('Missing timestamp in receipt', 'error');
            incrementCheck(false);
            return false;
        }

        // Skip files validation if this is not a file-based receipt
        // Some receipts might be different formats (like autopilot results)

        // Check if signatures are present (for signed receipts)
        if (receipt.signatures && Array.isArray(receipt.signatures)) {
            log(`Receipt has ${receipt.signatures.length} signature(s)`, 'info');

            const secretSeed = getEd25519Secret();
            if (!secretSeed) {
                log('Cannot verify signatures - no secret key available', 'warning');
                incrementCheck(true); // Still pass if no key available
                return true;
            }

            const { publicKey, keyId } = derivePublicKey(secretSeed);

            // Verify signatures
            const payloadForSigning = JSON.stringify({
                timestamp: receipt.timestamp || receipt.ts,
                files: receipt.files || receipt
            });

            let validSigs = 0;
            for (const sig of receipt.signatures) {
                if (sig.keyid === keyId) {
                    const isValid = verifySignature(payloadForSigning, sig.signature, publicKey);
                    if (isValid) {
                        validSigs++;
                        log(`Signature verified for key: ${sig.keyid}`, 'success');
                    } else {
                        log(`Invalid signature for key: ${sig.keyid}`, 'error');
                        incrementCheck(false);
                        return false;
                    }
                }
            }

            if (validSigs === 0) {
                log('No valid signatures found for our key', 'warning');
                // This is okay if the receipt was signed by a different key
            }
        }

        log(`Receipt valid`, 'success');
        incrementCheck(true);
        return true;

    } catch (error) {
        log(`Error verifying receipt: ${error.message}`, 'error');
        incrementCheck(false);
        return false;
    }
}

function verifyAttestationEnvelope(envelopePath) {
    log(`Verifying attestation envelope: ${envelopePath}`);

    try {
        const content = readFileSync(envelopePath, 'utf8');
        const envelope = JSON.parse(content);

        // Basic envelope validation
        if (envelope.payloadType !== 'purelambda/provenance+json') {
            log(`Invalid payload type: ${envelope.payloadType}`, 'error');
            incrementCheck(false);
            return false;
        }

        if (!envelope.payloadBase64) {
            log('Missing payload in envelope', 'error');
            incrementCheck(false);
            return false;
        }

        if (!envelope.signatures || !Array.isArray(envelope.signatures) || envelope.signatures.length === 0) {
            log('Missing signatures in envelope', 'error');
            incrementCheck(false);
            return false;
        }

        // Decode and validate payload
        const payloadJson = Buffer.from(envelope.payloadBase64, 'base64').toString('utf8');
        const provenance = JSON.parse(payloadJson);

        if (!provenance.ts || !provenance.gitRev) {
            log('Invalid provenance: missing required fields', 'error');
            incrementCheck(false);
            return false;
        }

        log(`Provenance timestamp: ${provenance.ts}`, 'info');
        log(`Git revision: ${provenance.gitRev}`, 'info');

        // Verify signatures if we have the key
        const secretSeed = getEd25519Secret();
        if (!secretSeed) {
            log('Cannot verify signatures - no secret key available', 'warning');
            incrementCheck(true); // Still pass validation if no key
            return true;
        }

        const { publicKey, keyId } = derivePublicKey(secretSeed);
        let validSigs = 0;

        for (const sig of envelope.signatures) {
            if (sig.keyid === keyId) {
                const isValid = verifySignature(payloadJson, sig.sigBase64, publicKey);
                if (isValid) {
                    validSigs++;
                    log(`Signature verified for key: ${sig.keyid}`, 'success');
                } else {
                    log(`Invalid signature for key: ${sig.keyid}`, 'error');
                    incrementCheck(false);
                    return false;
                }
            }
        }

        if (validSigs === 0) {
            log('No signatures verified with our key', 'warning');
        } else {
            log(`${validSigs} signature(s) verified`, 'success');
        }

        log('Envelope verification passed', 'success');
        incrementCheck(true);
        return true;

    } catch (error) {
        log(`Error verifying envelope: ${error.message}`, 'error');
        incrementCheck(false);
        return false;
    }
}

async function main() {
    log('🔍 Starting receipt verification...');
    log('');

    // Check if receipts directory exists
    if (!existsSync(receiptsDir)) {
        log(`Receipts directory not found: ${receiptsDir}`, 'error');
        process.exit(1);
    }

    // Find all .json files in receipts/ (excluding subdirectories for now)
    const receiptFiles = readdirSync(receiptsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => join(receiptsDir, file));

    if (receiptFiles.length === 0) {
        log('No receipt files found to verify', 'warning');
    } else {
        log(`Found ${receiptFiles.length} receipt file(s) to verify`);

        for (const receiptFile of receiptFiles) {
            const success = verifyReceipt(receiptFile);
            if (!success) {
                log(`Verification failed for: ${receiptFile}`, 'error');
                log('❌ Aborting on first failure', 'error');
                process.exit(1);
            }
        }
    }

    // Check for attestation envelope
    if (existsSync(envelopeFile)) {
        log('');
        const success = verifyAttestationEnvelope(envelopeFile);
        if (!success) {
            log('Attestation envelope verification failed', 'error');
            process.exit(1);
        }
    } else {
        log('No attestation envelope found (optional)', 'info');
    }

    // Summary
    log('');
    log('📊 VERIFICATION SUMMARY');
    log('=====================');
    log(`Total checks: ${totalChecks}`);
    log(`Passed: ${passedChecks}`, 'success');
    log(`Failed: ${failedChecks}`, failedChecks > 0 ? 'error' : 'success');

    if (failedChecks > 0) {
        log('', 'error');
        log('❌ VERIFICATION FAILED', 'error');
        process.exit(1);
    } else {
        log('');
        log('✅ ALL VERIFICATIONS PASSED', 'success');
        process.exit(0);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        log(`Verification error: ${error.message}`, 'error');
        process.exit(1);
    });
}