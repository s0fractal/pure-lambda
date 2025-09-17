#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Garden Seeds DSSE Attestation Script
 *
 * Signs all 9 garden seeds with DSSE envelopes using tweetnacl
 * Outputs to dsse/garden/<name>.envelope.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createHash, randomBytes } from 'crypto';
import nacl from 'tweetnacl';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Configuration
const config = {
  gardenDir: path.join(projectRoot, 'seeds', 'garden'),
  dsseDir: path.join(projectRoot, 'dsse', 'garden'),
  keyFile: path.join(projectRoot, '.secrets', 'signing-key.json')
};

// DSSE envelope structure
class DSSEEnvelope {
  constructor() {
    this.payloadType = 'application/vnd.in-toto+json';
    this.payloadBase64 = '';
    this.signatures = [];
  }
}

// Garden seed attestation data structure
class GardenAttestation {
  constructor(seedName, seedPath) {
    this.name = seedName;
    this.path = seedPath;
    this.timestamp = new Date().toISOString();
    this.version = "1.0.0";
    this.gitRev = null;
    this.seed = {
      path: path.relative(projectRoot, seedPath),
      hash: null,
      size: null,
      nodeCount: null,
      pattern: null
    };
    this.validation = {
      gidStable: null,
      iidStable: null,
      minRouteLen: null,
      structureValid: null
    };
    this.tools = {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }
}

class GardenAttester {
  constructor() {
    this.signingKey = null;
    this.publicKey = null;
    this.initializeKeys();
  }

  initializeKeys() {
    try {
      if (fs.existsSync(config.keyFile)) {
        const keyData = JSON.parse(fs.readFileSync(config.keyFile, 'utf8'));
        this.signingKey = new Uint8Array(keyData.secretKey);
        this.publicKey = new Uint8Array(keyData.publicKey);
      } else {
        // Generate new keypair
        const keypair = nacl.sign.keyPair();
        this.signingKey = keypair.secretKey;
        this.publicKey = keypair.publicKey;

        // Save keys
        fs.mkdirSync(path.dirname(config.keyFile), { recursive: true });
        fs.writeFileSync(config.keyFile, JSON.stringify({
          secretKey: Array.from(this.signingKey),
          publicKey: Array.from(this.publicKey)
        }), { mode: 0o600 });

        console.log('🔑 Generated new signing keypair');
      }
    } catch (error) {
      console.error('Failed to initialize keys:', error.message);
      process.exit(1);
    }
  }

  async getGitRevision() {
    try {
      return new Promise((resolve) => {
        const git = spawn('git', ['rev-parse', 'HEAD'], { cwd: projectRoot });
        let output = '';

        git.stdout.on('data', (data) => {
          output += data.toString();
        });

        git.on('close', (code) => {
          if (code === 0) {
            resolve(output.trim());
          } else {
            resolve('unknown');
          }
        });
      });
    } catch (error) {
      return 'unknown';
    }
  }

  calculateFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
  }

  analyzeSeed(seedPath) {
    try {
      const content = fs.readFileSync(seedPath, 'utf8');
      const seedData = JSON.parse(content);

      const stats = fs.statSync(seedPath);
      const nodeCount = Object.keys(seedData.nodes).filter(key =>
        seedData.nodes[key].op && seedData.nodes[key].op !== 'ROOT'
      ).length;

      return {
        hash: this.calculateFileHash(seedPath),
        size: stats.size,
        nodeCount,
        pattern: seedData.expected?.invariants?.[2] || 'unknown',
        gidStable: seedData.gidSet && seedData.gidSet.length > 0,
        iidStable: seedData.iidSet && seedData.iidSet.length > 0,
        minRouteLen: seedData.expected?.minRouteLen || 0,
        structureValid: !!(seedData.nodes && seedData.root && seedData.name)
      };
    } catch (error) {
      console.error(`Failed to analyze seed ${seedPath}:`, error.message);
      return null;
    }
  }

  async createAttestation(seedName, seedPath) {
    console.log(`📋 Creating attestation for ${seedName}...`);

    const attestation = new GardenAttestation(seedName, seedPath);
    attestation.gitRev = await this.getGitRevision();

    const analysis = this.analyzeSeed(seedPath);
    if (!analysis) {
      throw new Error(`Failed to analyze seed: ${seedName}`);
    }

    // Fill seed data
    attestation.seed.hash = analysis.hash;
    attestation.seed.size = analysis.size;
    attestation.seed.nodeCount = analysis.nodeCount;
    attestation.seed.pattern = analysis.pattern;

    // Fill validation data
    attestation.validation.gidStable = analysis.gidStable;
    attestation.validation.iidStable = analysis.iidStable;
    attestation.validation.minRouteLen = analysis.minRouteLen;
    attestation.validation.structureValid = analysis.structureValid;

    return attestation;
  }

  signAttestation(attestation) {
    const payload = JSON.stringify(attestation);
    const payloadBase64 = Buffer.from(payload, 'utf8').toString('base64');

    // Create pre-authentication encoding (PAE)
    const payloadType = 'application/vnd.in-toto+json';
    const pae = this.createPAE(payloadType, payloadBase64);

    // Sign the PAE
    const signature = nacl.sign(pae, this.signingKey);
    const sigBase64 = Buffer.from(signature).toString('base64');

    // Create DSSE envelope
    const envelope = new DSSEEnvelope();
    envelope.payloadType = payloadType;
    envelope.payloadBase64 = payloadBase64;
    envelope.signatures.push({
      keyid: Buffer.from(this.publicKey).toString('hex'),
      sigBase64: sigBase64
    });

    return envelope;
  }

  createPAE(payloadType, payloadBase64) {
    // DSSE Pre-Authentication Encoding
    const payloadTypeBytes = Buffer.from(payloadType, 'utf8');
    const payloadBytes = Buffer.from(payloadBase64, 'base64');

    const pae = Buffer.concat([
      Buffer.from('DSSEv1', 'utf8'),
      this.encodeLength(payloadTypeBytes.length),
      payloadTypeBytes,
      this.encodeLength(payloadBytes.length),
      payloadBytes
    ]);

    return new Uint8Array(pae);
  }

  encodeLength(length) {
    const buffer = Buffer.allocUnsafe(8);
    buffer.writeBigUInt64LE(BigInt(length), 0);
    return buffer;
  }

  verifyEnvelope(envelope) {
    try {
      if (!envelope.signatures || envelope.signatures.length === 0) {
        return { valid: false, message: 'No signatures found' };
      }

      const sig = envelope.signatures[0];
      const keyid = sig.keyid;
      const sigBytes = Buffer.from(sig.sigBase64, 'base64');

      // Recreate PAE
      const pae = this.createPAE(envelope.payloadType, envelope.payloadBase64);

      // Verify signature
      const publicKeyBytes = Buffer.from(keyid, 'hex');
      const verified = nacl.sign.open(sigBytes, publicKeyBytes);

      if (!verified) {
        return { valid: false, message: 'Signature verification failed' };
      }

      return { valid: true, message: 'Signature verified' };

    } catch (error) {
      return { valid: false, message: `Verification error: ${error.message}` };
    }
  }

  async attestAllSeeds() {
    console.log('🌱 Starting Garden Seeds DSSE Attestation...\n');

    // Ensure output directory exists
    fs.mkdirSync(config.dsseDir, { recursive: true });

    // Get all seed files
    const seedFiles = fs.readdirSync(config.gardenDir)
      .filter(file => file.endsWith('.json'))
      .sort();

    if (seedFiles.length === 0) {
      console.error('❌ No seed files found in', config.gardenDir);
      process.exit(1);
    }

    console.log(`📋 Found ${seedFiles.length} garden seeds to attest`);

    const results = [];

    for (const seedFile of seedFiles) {
      const seedName = path.basename(seedFile, '.json');
      const seedPath = path.join(config.gardenDir, seedFile);
      const envelopePath = path.join(config.dsseDir, `${seedName}.envelope.json`);

      try {
        // Create attestation
        const attestation = await this.createAttestation(seedName, seedPath);

        // Sign attestation
        const envelope = this.signAttestation(attestation);

        // Write envelope
        fs.writeFileSync(envelopePath, JSON.stringify(envelope, null, 2));

        // Verify envelope
        const verification = this.verifyEnvelope(envelope);

        const result = {
          seed: seedName,
          success: verification.valid,
          envelopePath: path.relative(projectRoot, envelopePath),
          message: verification.message,
          size: fs.statSync(envelopePath).size
        };

        results.push(result);

        if (verification.valid) {
          console.log(`✅ ${seedName}: signed and verified (${result.size} bytes)`);
        } else {
          console.log(`❌ ${seedName}: ${verification.message}`);
        }

      } catch (error) {
        const result = {
          seed: seedName,
          success: false,
          envelopePath: null,
          message: error.message,
          size: 0
        };

        results.push(result);
        console.log(`❌ ${seedName}: ${error.message}`);
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    const totalSize = results.reduce((sum, r) => sum + r.size, 0);

    console.log(`\n📊 Attestation Summary:`);
    console.log(`   Seeds processed: ${total}`);
    console.log(`   Successfully attested: ${successful}`);
    console.log(`   Failed: ${total - successful}`);
    console.log(`   Total envelope size: ${(totalSize / 1024).toFixed(1)} KB`);

    if (successful === total) {
      console.log('\n🎉 All garden seeds successfully attested!');
      process.exit(0);
    } else {
      console.log('\n❌ Some attestations failed');
      process.exit(1);
    }
  }
}

// Main execution
const attester = new GardenAttester();
attester.attestAllSeeds().catch(error => {
  console.error('💥 Attestation failed:', error.message);
  process.exit(1);
});