#!/usr/bin/env ts-node
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors


import * as fs from 'fs';
import * as crypto from 'crypto';
import { program } from 'commander';
import * as nacl from 'tweetnacl';
// Use CommonJS require to match existing code style
let CarReader: any = null;

try {
  ({ CarReader } = require('@ipld/car'));
} catch (error) {
  console.warn('⚠️ IPLD CarReader not available, using fallback');
}

interface Receipt {
  ts: string;
  rootCID: string;
  bestRoute: string[];
  Lbest: number;
  gidSet: string[];
  iidSet: string[];
  xidSet: string[];
  slo: {
    W_ok: boolean;
    K_ok: boolean;
  };
  hashes: {
    blake3_of_payload: string;
  };
  publicKey: string;
  signature: string;
}

interface OperonNode {
  gid: string;
  iid: string;
  xid: string;
  cost: string;
  op: string;
  law: string;
  links: Record<string, string>;
  ports: Record<string, string>;
  receipt: any;
}

interface OperonData {
  nodes: Record<string, OperonNode | { oids: string[]; root: string }>;
  root: string;
}

function isOperonNode(node: any): node is OperonNode {
  return node.hasOwnProperty('gid') && node.hasOwnProperty('op');
}

function extractIds(data: OperonData): { gidSet: string[], iidSet: string[], xidSet: string[] } {
  const gidSet: string[] = [];
  const iidSet: string[] = [];
  const xidSet: string[] = [];

  for (const [nodeId, node] of Object.entries(data.nodes)) {
    if (isOperonNode(node)) {
      if (node.gid) gidSet.push(node.gid);
      if (node.iid) iidSet.push(node.iid);
      if (node.xid) xidSet.push(node.xid);
    }
  }

  return {
    gidSet: Array.from(new Set(gidSet)), // Remove duplicates
    iidSet: Array.from(new Set(iidSet)),
    xidSet: Array.from(new Set(xidSet))
  };
}

async function extractRootCID(carFilePath: string): Promise<string> {
  try {
    if (!CarReader) {
      // Fallback: Use a simple hash of the file as a mock CID
      const carBuffer = fs.readFileSync(carFilePath);
      const hash = crypto.createHash('sha256').update(carBuffer).digest('hex');
      return `baf${hash.substring(0, 54)}`; // Mock CIDv1 format
    }

    const carBuffer = fs.readFileSync(carFilePath);
    const reader = await CarReader.fromBytes(carBuffer);
    const roots = await reader.getRoots();

    if (roots.length === 0) {
      throw new Error('No root CID found in CAR file');
    }

    return roots[0]!.toString();
  } catch (error) {
    throw new Error(`Failed to extract root CID: ${(error as Error).message}`);
  }
}

function blake3Hash(data: string): string {
  // Using Node.js crypto with SHA-256 as Blake3 isn't natively available
  // In production, you'd want to use the actual Blake3 implementation
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

function evaluateSLO(data: OperonData): { W_ok: boolean, K_ok: boolean } {
  // Simple SLO evaluation based on node count and complexity
  const nodeCount = Object.keys(data.nodes).length;
  const hasComplexOps = Object.values(data.nodes).some(node =>
    isOperonNode(node) && (node.op === 'REDUCE' || node.cost === 'O(n^2)' || node.cost === 'O(2^n)')
  );

  return {
    W_ok: nodeCount <= 100, // Workload size constraint
    K_ok: !hasComplexOps    // Complexity constraint
  };
}

function getKeyPair(): { secretKey: Uint8Array, publicKey: Uint8Array } {
  const secretHex = process.env.PL_ED25519_SECRET;

  if (!secretHex) {
    throw new Error('PL_ED25519_SECRET environment variable not set');
  }

  try {
    let seed: Uint8Array;

    if (secretHex.length === 64) {
      // 32 bytes for seed
      seed = new Uint8Array(Buffer.from(secretHex, 'hex'));
    } else if (secretHex.length === 128) {
      // 64 bytes total, take first 32 as seed
      seed = new Uint8Array(Buffer.from(secretHex.substring(0, 64), 'hex'));
    } else {
      throw new Error('PL_ED25519_SECRET must be 64 hex characters (32 bytes) or 128 hex characters (64 bytes)');
    }

    const keyPair = nacl.sign.keyPair.fromSeed(seed);
    return { secretKey: keyPair.secretKey, publicKey: keyPair.publicKey };
  } catch (error) {
    throw new Error(`Invalid secret key format: ${(error as Error).message}`);
  }
}

async function makeReceipt(operonJsonPath: string, carFilePath: string): Promise<Receipt> {
  // Read and parse operon data
  const operonContent = fs.readFileSync(operonJsonPath, 'utf-8');
  const data: OperonData = JSON.parse(operonContent);

  // Extract root CID from CAR file
  const rootCID = await extractRootCID(carFilePath);

  // Extract ID sets
  const { gidSet, iidSet, xidSet } = extractIds(data);

  // Simple autopilot selection (use first route for now)
  // In real implementation, this would import from autopilot.ts
  const bestRoute = [data.root];
  const Lbest = 1.0; // Simplified

  // Evaluate SLO
  const slo = evaluateSLO(data);

  // Create payload for hashing
  const payload = JSON.stringify({
    rootCID,
    bestRoute,
    Lbest,
    gidSet,
    iidSet,
    xidSet,
    slo
  });

  const blake3_of_payload = blake3Hash(payload);

  // Get key pair
  const { secretKey, publicKey } = getKeyPair();

  // Create receipt without signature first
  const receiptData = {
    ts: new Date().toISOString(),
    rootCID,
    bestRoute,
    Lbest,
    gidSet,
    iidSet,
    xidSet,
    slo,
    hashes: { blake3_of_payload },
    publicKey: Buffer.from(publicKey).toString('hex')
  };

  // Sign the receipt
  const receiptBytes = new TextEncoder().encode(JSON.stringify(receiptData));
  const signature = nacl.sign.detached(receiptBytes, secretKey);

  return {
    ...receiptData,
    signature: Buffer.from(signature).toString('hex')
  };
}

async function verifyReceipt(receiptPath: string): Promise<boolean> {
  try {
    const receiptContent = fs.readFileSync(receiptPath, 'utf-8');
    const receipt: Receipt = JSON.parse(receiptContent);

    // Extract signature and public key
    const signature = new Uint8Array(Buffer.from(receipt.signature, 'hex'));
    const publicKey = new Uint8Array(Buffer.from(receipt.publicKey, 'hex'));

    // Recreate the signed data (receipt without signature)
    const { signature: _, ...receiptWithoutSig } = receipt;
    const receiptBytes = new TextEncoder().encode(JSON.stringify(receiptWithoutSig));

    // Verify signature
    const isValid = nacl.sign.detached.verify(receiptBytes, signature, publicKey);

    if (isValid) {
      console.log('✓ Receipt signature is valid');
      console.log(`  Timestamp: ${receipt.ts}`);
      console.log(`  Root CID: ${receipt.rootCID}`);
      console.log(`  Best L: ${receipt.Lbest}`);
      console.log(`  SLO W_ok: ${receipt.slo.W_ok}, K_ok: ${receipt.slo.K_ok}`);
    } else {
      console.log('✗ Receipt signature is invalid');
    }

    return isValid;
  } catch (error) {
    console.error('Verification error:', (error as Error).message);
    return false;
  }
}

function main() {
  program
    .name('receipts')
    .description('Generate and verify signed receipts for Pure Lambda operons')
    .argument('[operon-json]', 'Path to operon JSON file (for generation)')
    .argument('[car-file]', 'Path to CAR file (for generation)')
    .option('--verify <receipt-file>', 'Verify a receipt file instead of generating')
    .action(async (operonJson, carFile, options) => {
      try {
        if (options.verify) {
          const isValid = await verifyReceipt(options.verify);
          process.exit(isValid ? 0 : 1);
        } else {
          if (!operonJson || !carFile) {
            console.error('Both operon-json and car-file arguments are required for generation');
            process.exit(1);
          }

          const receipt = await makeReceipt(operonJson, carFile);
          console.log(JSON.stringify(receipt, null, 2));
        }
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });

  program.parse();
}

if (require.main === module) {
  main();
}

export { makeReceipt, verifyReceipt };
export type { Receipt };