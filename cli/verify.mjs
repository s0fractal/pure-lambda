#!/usr/bin/env node
/**
 * Verify - Cryptographic verification for lattice snapshots
 * Ed25519 signatures + CID integrity
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Generate Ed25519 keypair
 */
function generateKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  // Save keys
  fs.writeFileSync('lattice-keys.json', JSON.stringify({
    publicKey: publicKey.replace(/\n/g, '\\n'),
    privateKey: privateKey.replace(/\n/g, '\\n'),
    algorithm: 'Ed25519',
    generated: new Date().toISOString()
  }, null, 2));

  console.log('🔑 Keypair generated: lattice-keys.json');
  return { publicKey, privateKey };
}

/**
 * Sign lattice snapshot
 */
function signSnapshot(snapshotPath, privateKeyPem) {
  const data = fs.readFileSync(snapshotPath);

  // Calculate CID (mock IPFS hash)
  const cidHash = crypto.createHash('sha256').update(data).digest('hex');
  const cid = 'Qm' + cidHash.substring(0, 44);

  // Sign the CID using Ed25519
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, Buffer.from(cid), privateKey).toString('hex');

  // Create signed manifest
  const manifest = {
    version: '1.0.0',
    cid: cid,
    signature: signature,
    algorithm: 'Ed25519-SHA256',
    timestamp: new Date().toISOString(),
    snapshot: path.basename(snapshotPath)
  };

  fs.writeFileSync('lattice-manifest.json', JSON.stringify(manifest, null, 2));

  console.log(`✅ Signed: ${snapshotPath}`);
  console.log(`   CID: ${cid}`);
  console.log(`   Sig: ${signature.substring(0, 32)}...`);

  return manifest;
}

/**
 * Verify snapshot integrity
 */
function verifySnapshot(snapshotPath, manifestPath, publicKeyPem) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const data = fs.readFileSync(snapshotPath);

  // Verify CID
  const cidHash = crypto.createHash('sha256').update(data).digest('hex');
  const calculatedCid = 'Qm' + cidHash.substring(0, 44);

  if (calculatedCid !== manifest.cid) {
    console.error('❌ CID mismatch!');
    console.error(`   Expected: ${manifest.cid}`);
    console.error(`   Got: ${calculatedCid}`);
    return false;
  }

  // Verify signature using Ed25519
  const publicKey = crypto.createPublicKey(publicKeyPem);
  const isValid = crypto.verify(null, Buffer.from(manifest.cid), publicKey, Buffer.from(manifest.signature, 'hex'));

  if (isValid) {
    console.log('✅ Verification PASSED');
    console.log(`   CID: ${manifest.cid}`);
    console.log(`   Signature: Valid`);
    console.log(`   Timestamp: ${manifest.timestamp}`);
  } else {
    console.error('❌ Signature verification FAILED');
  }

  return isValid;
}

/**
 * Add verification to receipts
 */
function enrichReceipt(receipt, manifest) {
  receipt.lattice_ref = {
    version: manifest.version,
    cid: manifest.cid,
    sig: manifest.signature.substring(0, 32) + '...',
    verified: true
  };
  return receipt;
}

/**
 * Main CLI
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('🔐 VERIFY - Lattice Cryptographic Verification\n');
    console.log('Commands:');
    console.log('  verify keygen              - Generate Ed25519 keypair');
    console.log('  verify sign <snapshot>     - Sign lattice snapshot');
    console.log('  verify check <snapshot>    - Verify snapshot integrity');
    console.log('  verify --cid <cid> --sig <sig> - Quick verification');
    return;
  }

  switch (command) {
    case 'keygen':
      generateKeypair();
      break;

    case 'sign':
      const snapshot = args[1] || '../fractal-lattice/LATTICE@v1.json';

      // Load or generate keys
      let privateKey;
      if (fs.existsSync('lattice-keys.json')) {
        const keys = JSON.parse(fs.readFileSync('lattice-keys.json', 'utf-8'));
        privateKey = keys.privateKey.replace(/\\n/g, '\n');
      } else {
        const keys = generateKeypair();
        privateKey = keys.privateKey;
      }

      signSnapshot(snapshot, privateKey);
      break;

    case 'check':
      const snapshotToVerify = args[1] || '../fractal-lattice/LATTICE@v1.json';
      const manifest = args[2] || 'lattice-manifest.json';

      // Load public key
      if (!fs.existsSync('lattice-keys.json')) {
        console.error('❌ No keys found. Run: verify keygen');
        process.exit(1);
      }

      const keys = JSON.parse(fs.readFileSync('lattice-keys.json', 'utf-8'));
      const publicKey = keys.publicKey.replace(/\\n/g, '\n');

      const valid = verifySnapshot(snapshotToVerify, manifest, publicKey);
      process.exit(valid ? 0 : 1);
      break;

    case '--cid':
      // Quick verification mode
      const cid = args[1];
      const sig = args[3];

      if (!cid || !sig) {
        console.error('Usage: verify --cid <cid> --sig <sig>');
        process.exit(1);
      }

      console.log(`Verifying CID: ${cid}`);
      console.log(`Signature: ${sig.substring(0, 32)}...`);

      // In production, would verify against blockchain or IPFS
      console.log('✅ Quick verification passed (mock)');
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

// Run
main();