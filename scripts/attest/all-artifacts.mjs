#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Attest All Artifacts Script
 *
 * Signs ALL: seeds/garden/*, dist/release/hello-city.{htmlc,cartridge},
 * dist/release/garden.fed.zip, federation.fed.zip
 * Creates DSSE envelopes for complete supply chain attestation
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createHash } from 'crypto';
import nacl from 'tweetnacl';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Configuration
const config = {
  gardenSeedsDir: path.join(projectRoot, 'seeds', 'garden'),
  releaseDir: path.join(projectRoot, 'dist', 'release'),
  dsseDir: path.join(projectRoot, 'dsse'),
  secretKeyFile: path.join(projectRoot, '.secrets', 'signing-key.json'),
  chainFile: path.join(projectRoot, 'docs', 'keys', 'chain.json')
};

// DSSE envelope structure
class DSSEEnvelope {
  constructor() {
    this.payloadType = 'application/vnd.in-toto+json';
    this.payloadBase64 = '';
    this.signatures = [];
    this.chain = [];
  }
}

// Universal artifact attestation structure
class ArtifactAttestation {
  constructor(artifactPath, artifactType) {
    this.name = path.basename(artifactPath);
    this.path = path.relative(projectRoot, artifactPath);
    this.type = artifactType;
    this.timestamp = new Date().toISOString();
    this.version = "1.0.0";
    this.gitRev = null;

    this.artifact = {
      path: this.path,
      hash: null,
      size: null,
      algorithm: 'sha256'
    };

    this.validation = {
      exists: null,
      readable: null,
      sizeValid: null,
      typeValid: null
    };

    this.tools = {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    };

    // Type-specific metadata
    this.metadata = {};
  }
}

class AllArtifactsAttester {
  constructor() {
    this.signingKey = null;
    this.publicKey = null;
    this.chain = [];
    this.initializeKeys();
  }

  initializeKeys() {
    try {
      if (!fs.existsSync(config.secretKeyFile)) {
        console.error('❌ No signing key found. Run scripts/attest/key-rotate.mjs first.');
        process.exit(1);
      }

      const keyData = JSON.parse(fs.readFileSync(config.secretKeyFile, 'utf8'));
      this.signingKey = new Uint8Array(keyData.secretKey);
      this.publicKey = new Uint8Array(keyData.publicKey);

      // Load chain if available
      if (fs.existsSync(config.chainFile)) {
        const chainData = JSON.parse(fs.readFileSync(config.chainFile, 'utf8'));
        this.chain = chainData.keys.map(key => ({
          keyId: key.keyId,
          createdAt: key.createdAt
        }));
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

  validateArtifact(artifactPath, artifactType) {
    const validation = {
      exists: fs.existsSync(artifactPath),
      readable: false,
      sizeValid: false,
      typeValid: false
    };

    if (validation.exists) {
      try {
        fs.accessSync(artifactPath, fs.constants.R_OK);
        validation.readable = true;

        const stats = fs.statSync(artifactPath);
        validation.sizeValid = stats.size > 0;

        // Type-specific validation
        switch (artifactType) {
          case 'garden-seed':
            validation.typeValid = artifactPath.endsWith('.json') &&
              this.isValidGardenSeed(artifactPath);
            break;
          case 'htmlc':
            validation.typeValid = artifactPath.endsWith('.htmlc');
            break;
          case 'cartridge':
            validation.typeValid = artifactPath.endsWith('.cartridge');
            break;
          case 'federation-zip':
            validation.typeValid = artifactPath.endsWith('.fed.zip');
            break;
        }

      } catch (error) {
        // File exists but not readable
      }
    }

    return validation;
  }

  isValidGardenSeed(seedPath) {
    try {
      const content = fs.readFileSync(seedPath, 'utf8');
      const seedData = JSON.parse(content);
      return !!(seedData.nodes && seedData.root && seedData.name);
    } catch (error) {
      return false;
    }
  }

  analyzeGardenSeed(seedPath) {
    try {
      const content = fs.readFileSync(seedPath, 'utf8');
      const seedData = JSON.parse(content);

      const nodeCount = Object.keys(seedData.nodes).filter(key =>
        seedData.nodes[key].op && seedData.nodes[key].op !== 'ROOT'
      ).length;

      return {
        nodeCount,
        pattern: seedData.expected?.invariants?.[2] || 'unknown',
        gidStable: seedData.gidSet && seedData.gidSet.length > 0,
        iidStable: seedData.iidSet && seedData.iidSet.length > 0,
        minRouteLen: seedData.expected?.minRouteLen || 0
      };
    } catch (error) {
      return null;
    }
  }

  analyzeHtmlc(htmlcPath) {
    try {
      const stats = fs.statSync(htmlcPath);
      const content = fs.readFileSync(htmlcPath, 'utf8');

      // Look for embedded metadata
      const metadataMatch = content.match(/<!-- HTMLC-META: (.*?) -->/);
      let metadata = {};
      if (metadataMatch) {
        try {
          metadata = JSON.parse(metadataMatch[1]);
        } catch (e) {
          // Ignore parse errors
        }
      }

      return {
        compressed: true,
        originalSize: metadata.originalSize || null,
        compressionRatio: metadata.compressionRatio || null,
        embedded: content.includes('<!-- HTMLC-'),
        scriptTags: (content.match(/<script/g) || []).length,
        styleTags: (content.match(/<style/g) || []).length
      };
    } catch (error) {
      return null;
    }
  }

  analyzeCartridge(cartridgePath) {
    try {
      const stats = fs.statSync(cartridgePath);

      // Try to read as binary and look for headers
      const buffer = fs.readFileSync(cartridgePath);
      const header = buffer.slice(0, 16).toString('utf8', 0, 8);

      return {
        binaryFormat: true,
        header: header.replace(/\0/g, ''),
        size: stats.size,
        created: stats.ctime.toISOString()
      };
    } catch (error) {
      return null;
    }
  }

  analyzeFederationZip(zipPath) {
    try {
      const stats = fs.statSync(zipPath);

      return {
        archive: true,
        compressed: true,
        size: stats.size,
        created: stats.ctime.toISOString()
      };
    } catch (error) {
      return null;
    }
  }

  async createAttestation(artifactPath, artifactType) {
    console.log(`📋 Creating attestation for ${path.basename(artifactPath)} (${artifactType})...`);

    const attestation = new ArtifactAttestation(artifactPath, artifactType);
    attestation.gitRev = await this.getGitRevision();

    // Basic artifact validation
    const validation = this.validateArtifact(artifactPath, artifactType);
    attestation.validation = validation;

    if (!validation.exists || !validation.readable) {
      throw new Error(`Artifact not accessible: ${artifactPath}`);
    }

    // Calculate hash and size
    attestation.artifact.hash = this.calculateFileHash(artifactPath);
    attestation.artifact.size = fs.statSync(artifactPath).size;

    // Type-specific analysis
    switch (artifactType) {
      case 'garden-seed':
        attestation.metadata = this.analyzeGardenSeed(artifactPath);
        break;
      case 'htmlc':
        attestation.metadata = this.analyzeHtmlc(artifactPath);
        break;
      case 'cartridge':
        attestation.metadata = this.analyzeCartridge(artifactPath);
        break;
      case 'federation-zip':
        attestation.metadata = this.analyzeFederationZip(artifactPath);
        break;
    }

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
    envelope.chain = [...this.chain];

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

  getAllArtifacts() {
    const artifacts = [];

    // Garden seeds
    if (fs.existsSync(config.gardenSeedsDir)) {
      const seedFiles = fs.readdirSync(config.gardenSeedsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => ({
          path: path.join(config.gardenSeedsDir, file),
          type: 'garden-seed'
        }));
      artifacts.push(...seedFiles);
    }

    // Release artifacts
    const releaseArtifacts = [
      { path: path.join(config.releaseDir, 'hello-city.htmlc'), type: 'htmlc' },
      { path: path.join(config.releaseDir, 'hello-city.cartridge'), type: 'cartridge' },
      { path: path.join(config.releaseDir, 'garden.fed.zip'), type: 'federation-zip' },
      { path: path.join(projectRoot, 'federation.fed.zip'), type: 'federation-zip' }
    ];

    // Only include artifacts that exist
    for (const artifact of releaseArtifacts) {
      if (fs.existsSync(artifact.path)) {
        artifacts.push(artifact);
      }
    }

    return artifacts;
  }

  async attestAllArtifacts() {
    console.log('📋 Starting Complete Artifact Attestation...\n');

    // Ensure output directories exist
    fs.mkdirSync(path.join(config.dsseDir, 'garden'), { recursive: true });
    fs.mkdirSync(path.join(config.dsseDir, 'release'), { recursive: true });

    // Get all artifacts
    const artifacts = this.getAllArtifacts();

    if (artifacts.length === 0) {
      console.error('❌ No artifacts found to attest');
      process.exit(1);
    }

    console.log(`📋 Found ${artifacts.length} artifacts to attest`);

    const results = [];

    for (const artifact of artifacts) {
      const artifactName = path.basename(artifact.path);
      let outputDir, fileName;

      if (artifact.type === 'garden-seed') {
        outputDir = path.join(config.dsseDir, 'garden');
        fileName = `${path.basename(artifact.path, '.json')}.envelope.json`;
      } else {
        outputDir = path.join(config.dsseDir, 'release');
        fileName = `${artifactName}.envelope.json`;
      }

      const envelopePath = path.join(outputDir, fileName);

      try {
        // Create attestation
        const attestation = await this.createAttestation(artifact.path, artifact.type);

        // Sign attestation
        const envelope = this.signAttestation(attestation);

        // Write envelope
        fs.writeFileSync(envelopePath, JSON.stringify(envelope, null, 2));

        // Verify envelope
        const verification = this.verifyEnvelope(envelope);

        const result = {
          artifact: artifactName,
          type: artifact.type,
          success: verification.valid,
          envelopePath: path.relative(projectRoot, envelopePath),
          message: verification.message,
          size: fs.statSync(envelopePath).size,
          hash: attestation.artifact.hash
        };

        results.push(result);

        if (verification.valid) {
          console.log(`✅ ${artifactName} (${artifact.type}): signed and verified (${result.size} bytes)`);
        } else {
          console.log(`❌ ${artifactName}: ${verification.message}`);
        }

      } catch (error) {
        const result = {
          artifact: artifactName,
          type: artifact.type,
          success: false,
          envelopePath: null,
          message: error.message,
          size: 0,
          hash: null
        };

        results.push(result);
        console.log(`❌ ${artifactName}: ${error.message}`);
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    const totalSize = results.reduce((sum, r) => sum + r.size, 0);

    console.log(`\n📊 Attestation Summary:`);
    console.log(`   Artifacts processed: ${total}`);
    console.log(`   Successfully attested: ${successful}`);
    console.log(`   Failed: ${total - successful}`);
    console.log(`   Total envelope size: ${(totalSize / 1024).toFixed(1)} KB`);

    // Group by type
    const byType = results.reduce((acc, r) => {
      if (!acc[r.type]) acc[r.type] = { total: 0, success: 0 };
      acc[r.type].total++;
      if (r.success) acc[r.type].success++;
      return acc;
    }, {});

    console.log(`\n📋 By Type:`);
    Object.entries(byType).forEach(([type, stats]) => {
      console.log(`   ${type}: ${stats.success}/${stats.total} successful`);
    });

    if (successful === total) {
      console.log('\n🎉 All artifacts successfully attested!');
      process.exit(0);
    } else {
      console.log('\n❌ Some attestations failed');
      process.exit(1);
    }
  }
}

// Command line interface
function printHelp() {
  console.log('Complete Artifact Attestation Tool');
  console.log('');
  console.log('Attests ALL artifacts:');
  console.log('  • Garden seeds (seeds/garden/*.json)');
  console.log('  • Hello City HTMLC (dist/release/hello-city.htmlc)');
  console.log('  • Hello City Cartridge (dist/release/hello-city.cartridge)');
  console.log('  • Federation archives (*.fed.zip)');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/attest/all-artifacts.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h          Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/attest/all-artifacts.mjs');
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  try {
    const attester = new AllArtifactsAttester();
    attester.attestAllArtifacts().catch(error => {
      console.error('💥 Attestation failed:', error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error('💥 Attestation initialization failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}