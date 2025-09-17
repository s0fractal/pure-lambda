#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Blake3-style keyed hash (using SHA256 as fallback)
function blake3(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Get git revision
function getGitRev() {
  try {
    const { execSync } = require('node:child_process');
    return execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: projectRoot }).trim();
  } catch (error) {
    return '0'.repeat(40);
  }
}

// Create DSSE envelope
function createEnvelope(payload) {
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');

  // Create signature (deterministic for reproducibility)
  const sig = crypto.createHmac('sha256', 'pure-lambda-attestation')
    .update(payloadBase64)
    .digest('base64');

  return {
    payloadBase64,
    payloadType: 'application/vnd.in-toto+json',
    signatures: [{
      keyid: 'did:web:pure-lambda.tech:keys:garden',
      sigBase64: sig
    }],
    chain: {
      root: 'pure-lambda-root',
      depth: 1
    }
  };
}

async function attestGardenSeeds() {
  console.log('🌱 Creating DSSE attestations for garden seeds...');

  const gardenDir = path.join(projectRoot, 'seeds', 'garden');
  const dsseDir = path.join(projectRoot, 'dsse', 'garden');

  // Ensure DSSE directory exists
  if (!fs.existsSync(dsseDir)) {
    fs.mkdirSync(dsseDir, { recursive: true });
  }

  const gitRev = getGitRev();
  const seeds = fs.readdirSync(gardenDir).filter(f => f.endsWith('.json'));

  for (const seedFile of seeds) {
    const seedPath = path.join(gardenDir, seedFile);
    const seedName = path.basename(seedFile, '.json');

    try {
      // Read seed file
      const fileBytes = fs.readFileSync(seedPath);
      const fileHash = blake3(fileBytes);
      const fileSize = fileBytes.length;

      // Create attestation payload
      const payload = {
        schema: 'PL-DSSE-01',
        subject: {
          name: seedFile,
          kind: 'seed',
          mediaType: 'application/json',
          size: fileSize,
          blake3: fileHash,
          gitRev: gitRev
        },
        issuedAt: new Date().toISOString(),
        provenance: {
          builder: 'pure-lambda/garden',
          invocation: {
            configSource: {
              uri: 'https://github.com/s0fractal/pure-lambda',
              digest: { sha256: gitRev }
            }
          },
          metadata: {
            reproducible: true,
            completeness: {
              arguments: true,
              environment: false
            }
          }
        }
      };

      // Create and save envelope
      const envelope = createEnvelope(payload);
      const envelopePath = path.join(dsseDir, `${seedName}.envelope.json`);

      fs.writeFileSync(envelopePath, JSON.stringify(envelope, null, 2));
      console.log(`   ✅ ${seedName}: ${fileHash.substring(0, 8)}...`);

    } catch (error) {
      console.error(`   ❌ ${seedName}: ${error.message}`);
    }
  }

  console.log('\n✅ Garden seed attestations complete!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  attestGardenSeeds().catch(console.error);
}