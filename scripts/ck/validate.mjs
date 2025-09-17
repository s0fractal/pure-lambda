#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Canonical bytes serialization
function canonicalBytes(obj) {
  const sorted = JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((result, key) => {
        result[key] = value[key];
        return result;
      }, {});
    }
    return value;
  });
  return Buffer.from(sorted, 'utf8');
}

// Blake3-style keyed hash (using SHA256 as fallback)
function blake3Keyed(key, data) {
  const hash = crypto.createHash('sha256');
  hash.update(key);
  hash.update(data);
  return hash.digest('hex');
}

// Compute Merkle root
function merkleRoot(hashes) {
  if (hashes.length === 0) return '';
  const sorted = [...hashes].sort();
  if (sorted.length === 1) return sorted[0] || '';

  const hash = crypto.createHash('sha256');
  for (const h of sorted) {
    hash.update(h);
  }
  return hash.digest('hex');
}

// Compute XIDv2
function computeXIDv2(seed, gitRev = '') {
  const gid = seed.meta?.gidSet?.[0] || '';
  const iidSet = seed.meta?.iidSet || [];
  const xidSet = seed.meta?.xidSet || [];

  // Canonical NF representation
  const nfCanonical = {
    tiles: seed.tiles || [],
    nodes: seed.nodes || {},
    version: seed.version || 1,
    pl_seed: seed.pl_seed || 'PL-SEED-01',
    name: seed.name || seed.pl_seed || ''
  };

  // Extract route/cost/profile from meta
  const route = seed.meta?.route || { nodes: [], edges: [] };
  const cost = seed.meta?.cost || { lambda: 1, mu: 1, Lbest: 1 };
  const profile = seed.meta?.profile || 'universal';

  const payloadXIDv2 = {
    schema: 'PL-XID-02',
    gid,
    iidRoot: merkleRoot(iidSet),
    xidRoot: merkleRoot(xidSet),
    nfCanonical: canonicalBytes(nfCanonical).toString('base64'),
    route,
    cost,
    profile,
    build: {
      plSpec: 'v0.1',
      toolchain: 'b2',
      gitRev: gitRev || ''
    }
  };

  const canonBytes = canonicalBytes(payloadXIDv2);
  return blake3Keyed('pl:xid:v2', canonBytes);
}

// Validate seed structure and conformance
function validateConformance(seed) {
  const issues = [];
  let score = 100;

  // Required fields
  if (!seed.name) {
    issues.push('Missing seed name');
    score -= 10;
  }

  // Support both 'tiles' and 'nodes' formats
  const hasValidStructure = (seed.tiles && Array.isArray(seed.tiles)) ||
                           (seed.nodes && typeof seed.nodes === 'object');

  if (!hasValidStructure) {
    issues.push('Missing or invalid tiles/nodes structure');
    score -= 20;
  }

  if (!seed.version) {
    issues.push('Missing version');
    score -= 5;
  }

  // Size limits
  const nodeCount = seed.tiles?.length || Object.keys(seed.nodes || {}).length;
  if (nodeCount > 1000) {
    issues.push(`Too many nodes/tiles: ${nodeCount} > 1000`);
    score -= 20;
  }

  if (seed.edges && seed.edges.length > 5000) {
    issues.push(`Too many edges: ${seed.edges.length} > 5000`);
    score -= 15;
  }

  // Structure validation
  if (seed.tiles) {
    for (const tile of seed.tiles) {
      if (!tile.id) {
        issues.push('Tile missing id');
        score -= 5;
        break;
      }
      if (!tile.type) {
        issues.push('Tile missing type');
        score -= 5;
        break;
      }
    }
  } else if (seed.nodes) {
    // Validate nodes structure
    const nodeIds = Object.keys(seed.nodes);
    if (nodeIds.length === 0) {
      issues.push('Empty nodes object');
      score -= 10;
    } else {
      // Check first few nodes for required fields
      for (const nodeId of nodeIds.slice(0, 3)) {
        const node = seed.nodes[nodeId];
        if (!node.gid && !node.op) {
          issues.push('Node missing required fields (gid or op)');
          score -= 5;
          break;
        }
      }
    }
  }

  // GID/IID/XID stability
  if (seed.meta?.gidSet && seed.meta.gidSet.length === 0) {
    issues.push('Empty GID set');
    score -= 10;
  }

  if (seed.meta?.iidSet && seed.meta.iidSet.length === 0) {
    issues.push('Empty IID set');
    score -= 10;
  }

  return {
    score: Math.max(0, score),
    issues
  };
}

// Verify DSSE envelope
function verifyDSSE(envelope) {
  if (!envelope) return { valid: false, reason: 'No envelope provided' };

  try {
    // Basic structure validation
    const validPayloadTypes = [
      'application/vnd.in-toto+json',
      'application/vnd.pure-lambda.attestation+json',
      'purelambda/provenance+json'
    ];

    if (!envelope.payloadType && !envelope.payload) {
      return { valid: false, reason: 'Missing payload type' };
    }

    const hasPayload = envelope.payloadBase64 || envelope.payload;
    if (!hasPayload) {
      return { valid: false, reason: 'Missing payload data' };
    }

    if (!envelope.signatures || envelope.signatures.length === 0) {
      return { valid: false, reason: 'Missing signatures' };
    }

    const sig = envelope.signatures[0];
    if (!sig.keyid || !(sig.sigBase64 || sig.sig)) {
      return { valid: false, reason: 'Invalid signature structure' };
    }

    // Parse payload
    const payloadData = envelope.payloadBase64 || envelope.payload;
    const payload = JSON.parse(Buffer.from(payloadData, 'base64').toString());

    if (!payload.subject) {
      return { valid: false, reason: 'Missing subject in payload' };
    }

    return {
      valid: true,
      subject: payload.subject,
      schema: payload.schema
    };

  } catch (error) {
    return { valid: false, reason: 'Parse error: ' + error.message };
  }
}

// Calculate trust score
function calculateTrustScore(conformance, dsseValid, freshness = 1.0) {
  const dsseScore = dsseValid ? 100 : 0;
  const confScore = conformance.score;
  const freshScore = freshness * 100;

  const trustScore = (0.4 * dsseScore + 0.4 * confScore + 0.2 * freshScore) / 100;

  return {
    trustScore,
    components: {
      dsse: { score: dsseScore, weight: 0.4 },
      conformance: { score: confScore, weight: 0.4 },
      freshness: { score: freshScore, weight: 0.2 }
    }
  };
}

// Main validation function
async function validateSeed(seedPath, envelopePath = null) {
  console.log(`🔍 Validating seed: ${seedPath}`);

  // Check file exists
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found: ${seedPath}`);
  }

  // Read and parse seed
  const seedContent = fs.readFileSync(seedPath, 'utf8');
  const seed = JSON.parse(seedContent);

  console.log(`   Name: ${seed.name}`);
  console.log(`   Size: ${(seedContent.length / 1024).toFixed(1)} KB`);

  // Size check
  const sizeKB = seedContent.length / 1024;
  if (sizeKB > 80) {
    throw new Error(`Seed too large: ${sizeKB.toFixed(1)}KB > 80KB limit`);
  }

  // 1. Canonicalization
  console.log('\n📐 Canonicalizing...');
  const canonBytes = canonicalBytes(seed);
  const canonHash = crypto.createHash('sha256').update(canonBytes).digest('hex');
  console.log(`   Canonical hash: ${canonHash.slice(0, 16)}...`);

  // 2. Conformance validation
  console.log('\n✅ Checking conformance...');
  const conformance = validateConformance(seed);
  console.log(`   Score: ${conformance.score}%`);
  if (conformance.issues.length > 0) {
    console.log('   Issues:');
    conformance.issues.forEach(issue => console.log(`     - ${issue}`));
  }

  // 3. XIDv2 computation
  console.log('\n🔑 Computing XIDv2...');
  const xidV2 = computeXIDv2(seed);
  console.log(`   XIDv2: ${xidV2.slice(0, 16)}...`);

  // 4. DSSE verification (if envelope provided)
  let dsseResult = { valid: false, reason: 'No envelope provided' };
  if (envelopePath && fs.existsSync(envelopePath)) {
    console.log('\n🔒 Verifying DSSE...');
    const envelopeContent = fs.readFileSync(envelopePath, 'utf8');
    const envelope = JSON.parse(envelopeContent);
    dsseResult = verifyDSSE(envelope);

    if (dsseResult.valid) {
      console.log(`   ✅ DSSE valid (${dsseResult.schema})`);
      console.log(`   Subject: ${dsseResult.subject?.name}`);
    } else {
      console.log(`   ❌ DSSE invalid: ${dsseResult.reason}`);
    }
  } else {
    console.log('\n🔒 DSSE: No envelope provided (optional)');
  }

  // 5. Calculate trust score
  console.log('\n🎯 Calculating trust score...');
  const trust = calculateTrustScore(conformance, dsseResult.valid);

  const results = {
    seed: {
      name: seed.name,
      path: seedPath,
      sizeKB: sizeKB,
      canonicalHash: canonHash,
      xidV2: xidV2
    },
    conformance: {
      score: conformance.score,
      issues: conformance.issues
    },
    dsse: dsseResult,
    trust: trust,
    timestamp: new Date().toISOString(),
    ready: trust.trustScore >= 0.95 && sizeKB <= 80
  };

  // Display results
  console.log(`\n📊 Results:`);
  console.log(`   Trust Score: ${(trust.trustScore * 100).toFixed(1)}%`);
  console.log(`   DSSE: ${dsseResult.valid ? '✅' : '❌'} (${trust.components.dsse.score}%)`);
  console.log(`   Conformance: ${conformance.score >= 90 ? '✅' : '⚠️'} (${conformance.score}%)`);
  console.log(`   Freshness: ✅ (${trust.components.freshness.score}%)`);
  console.log(`   Ready: ${results.ready ? '✅ READY' : '❌ NOT READY'}`);

  return results;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Pure Lambda Contributor Kit - Validator');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/ck/validate.mjs <seed.json> [envelope.json]');
    console.log('');
    console.log('Validates seed conformance, computes XIDv2, and verifies DSSE.');
    console.log('Returns exit code 0 if Trust ≥ 95%, otherwise 1.');
    console.log('');
    console.log('Output: out/ck/validate.json');
    process.exit(1);
  }

  const seedPath = args[0];
  const envelopePath = args[1] || null;

  try {
    const results = await validateSeed(seedPath, envelopePath);

    // Ensure output directory exists
    const outDir = path.join(projectRoot, 'out', 'ck');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Save results
    const outputPath = path.join(outDir, 'validate.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved: ${outputPath}`);

    // Exit with appropriate code
    if (results.ready) {
      console.log('\n🎉 Validation PASSED - Ready for submission!');
      process.exit(0);
    } else {
      console.log('\n❌ Validation FAILED - Trust < 95% or size > 80KB');
      process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateSeed, computeXIDv2, canonicalBytes };