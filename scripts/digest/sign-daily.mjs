#!/usr/bin/env node

import fs from "fs";
import { blake3 } from "blake3-wasm";
import nacl from "tweetnacl";
import { execSync } from "node:child_process";
import { createHash } from "crypto";

async function fileHash(p) {
  try {
    const buf = fs.readFileSync(p);
    return Buffer.from(await blake3(buf)).toString("hex");
  } catch (e) {
    // Fallback to SHA256 if blake3 fails
    const buf = fs.readFileSync(p);
    return createHash('sha256').update(buf).digest('hex');
  }
}

const PATH = "docs/status/daily.md";
const outDir = "receipts/attest";

async function signDaily() {
  try {
    // Ensure output directory exists
    fs.mkdirSync(outDir, { recursive: true });

    // Check if daily digest exists
    if (!fs.existsSync(PATH)) {
      console.error(`❌ Daily digest not found: ${PATH}`);
      process.exit(1);
    }

    // Read and hash the daily digest
    const bytes = fs.readFileSync(PATH);
    const b3 = Buffer.from(await blake3(bytes)).toString("hex");
    const gitRev = execSync("git rev-parse HEAD").toString().trim();

    // Check for previous day's envelope for hash-chain
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    const yStr = yesterday.toISOString().slice(0, 10);
    const prevPath = `${outDir}/daily-${yStr}.envelope.json`;

    let prevEnvelopeHash = null;
    if (fs.existsSync(prevPath)) {
      try {
        prevEnvelopeHash = await fileHash(prevPath);
        console.log(`🔗 Hash-chain: previous envelope ${yStr} → ${prevEnvelopeHash.slice(0, 12)}...`);
      } catch (e) {
        console.warn(`⚠️ Could not hash previous envelope: ${e.message}`);
      }
    } else {
      console.log(`🔗 Hash-chain: no previous envelope (${yStr}) - starting chain`);
    }

    // Create DSSE payload with hash-chain
    const payload = Buffer.from(JSON.stringify({
      subject: {
        path: PATH,
        digest: { "blake3-256": b3 },
        size: bytes.length
      },
      kind: "pl/daily-digest@v1",
      gitRev,
      ts: new Date().toISOString(),
      prevDate: yStr,
      prevEnvelopeHash
    }));

    // Get signing key from environment
    if (!process.env.PL_ED25519_SECRET) {
      console.error("❌ Missing PL_ED25519_SECRET environment variable");
      process.exit(1);
    }

    const sk = Buffer.from(process.env.PL_ED25519_SECRET, "base64");
    const kp = nacl.sign.keyPair.fromSeed(sk.slice(0, 32));
    const sig = Buffer.from(nacl.sign.detached(payload, kp.secretKey)).toString("base64");

    // Create DSSE envelope
    const env = {
      _type: "dsse-envelope",
      payloadType: "application/vnd.pl.digest+json",
      payload: payload.toString("base64"),
      signatures: [{
        keyid: Buffer.from(kp.publicKey).toString("base64"),
        sig
      }]
    };

    // Write signed envelope
    const tag = new Date().toISOString().slice(0, 10);
    const envPath = `${outDir}/daily-${tag}.envelope.json`;
    fs.writeFileSync(envPath, JSON.stringify(env, null, 2));

    console.log(`✅ Signed: ${PATH} (blake3=${b3.slice(0, 12)}…) → ${envPath}`);

  } catch (error) {
    console.error("❌ Failed to sign daily digest:", error.message);
    process.exit(1);
  }
}

signDaily();