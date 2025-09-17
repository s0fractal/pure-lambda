#!/usr/bin/env node

import fs from 'fs';
import { createHash } from 'crypto';
import nacl from 'tweetnacl';

async function attestCAR() {
  try {
    const date = process.argv[2] || new Date().toISOString().slice(0, 10);
    const carPath = `dist/snapshots/${date}.car`;

    if (!fs.existsSync(carPath)) {
      console.error(`❌ CAR file not found: ${carPath}`);
      process.exit(1);
    }

    console.log(`🔐 Attesting CAR snapshot: ${carPath}`);

    // Read and hash the CAR file
    const buf = fs.readFileSync(carPath);
    let subjectHash;

    try {
      const { blake3 } = await import('blake3-wasm');
      subjectHash = Buffer.from(await blake3(buf)).toString('hex');
    } catch (e) {
      // Fallback to SHA256
      subjectHash = createHash('sha256').update(buf).digest('hex');
    }

    // Create attestation payload
    const payload = {
      _type: 'car-snapshot',
      date,
      subject: {
        path: carPath,
        size: fs.statSync(carPath).size,
        digest: { "blake3-256": subjectHash }
      },
      kind: "pl/car-snapshot@v1",
      ts: new Date().toISOString()
    };

    // Get signing key
    const secretHex = process.env.PL_ED25519_SECRET;
    if (!secretHex) {
      console.error('❌ PL_ED25519_SECRET missing');
      process.exit(1);
    }

    const secret = Buffer.from(secretHex, 'base64');
    const keyPair = nacl.sign.keyPair.fromSeed(secret.slice(0, 32));
    const payloadBytes = Buffer.from(JSON.stringify(payload));
    const signature = Buffer.from(nacl.sign.detached(payloadBytes, keyPair.secretKey)).toString('base64');

    // Create DSSE envelope
    const envelope = {
      _type: 'dsse-envelope',
      payloadType: 'application/vnd.pl.car+json',
      payload: payloadBytes.toString('base64'),
      signatures: [{
        keyid: Buffer.from(keyPair.publicKey).toString('base64'),
        sig: signature
      }]
    };

    // Write signed envelope
    const outDir = 'receipts/attest/snapshots';
    const outPath = `${outDir}/${date}.car.envelope.json`;
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(envelope, null, 2));

    console.log(`✅ CAR attested: ${outPath}`);
    console.log(`🔐 Subject hash: ${subjectHash.slice(0, 16)}...`);

  } catch (error) {
    console.error('❌ Failed to attest CAR:', error.message);
    process.exit(1);
  }
}

attestCAR();