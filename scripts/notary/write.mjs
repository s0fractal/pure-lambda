#!/usr/bin/env node

/**
 * Public Verifier Notary
 * Publishes public key fingerprint and signature chain
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

function generateNotary(pubKeyPath = 'keys/current.pub', outPath = 'docs/NOTARY.md') {
  console.log('🔏 Public Verifier Notary');
  console.log('=' .repeat(40));

  // Read public key
  const pubKeyFullPath = path.join(projectRoot, pubKeyPath);
  let pubKey = '';
  let pubKeyFingerprint = '';

  if (fs.existsSync(pubKeyFullPath)) {
    pubKey = fs.readFileSync(pubKeyFullPath, 'utf8');
    // Calculate fingerprint
    pubKeyFingerprint = crypto.createHash('sha256')
      .update(pubKey)
      .digest('hex')
      .toUpperCase()
      .match(/.{1,4}/g)
      .join(':');
  } else {
    console.log('⚠️ Public key not found, using placeholder');
    pubKeyFingerprint = 'PLACEHOLDER:KEY:FINGERPRINT';
  }

  // Collect recent envelope hashes
  const digestsDir = path.join(projectRoot, 'dist', 'digests');
  const envelopeHashes = [];

  if (fs.existsSync(digestsDir)) {
    const files = fs.readdirSync(digestsDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .slice(-7); // Last 7 days

    files.forEach(file => {
      try {
        const digest = JSON.parse(fs.readFileSync(path.join(digestsDir, file), 'utf8'));
        if (digest.prevEnvelopeHash) {
          envelopeHashes.push({
            date: file.replace('.json', '').replace('daily-', ''),
            hash: digest.prevEnvelopeHash,
            carCID: digest.carCID || null
          });
        }
      } catch (e) {
        // Skip invalid files
      }
    });
  }

  // Get latest CAR CID
  const latestCarCID = envelopeHashes[envelopeHashes.length - 1]?.carCID || 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';

  // Generate NOTARY.md
  const notaryContent = `# Public Verifier Notary

## Trust Root

### Public Key Fingerprint
\`\`\`
${pubKeyFingerprint}
\`\`\`

### Signature Chain (Last 7 Days)
${envelopeHashes.length > 0 ? envelopeHashes.map(h => `- **${h.date}**: \`${h.hash}\``).join('\n') : '- No signatures yet'}

### Latest CAR Archive
- **IPFS CID**: \`${latestCarCID}\`
- **Gateway**: https://ipfs.io/ipfs/${latestCarCID}

## Verification Instructions

### Online Verification
\`\`\`bash
# Verify latest digest
make notary-verify

# Verify specific date
make verify-digest DATE=2025-09-17
\`\`\`

### Offline Verification
1. Download the verification tool: \`docs/verify/index.html\`
2. Open in any browser (works offline)
3. Drag & drop any seed.json or digest.json file
4. Tool will verify signatures using embedded public key

### Manual Verification
\`\`\`bash
# Verify DSSE envelope
openssl dgst -sha256 -verify keys/current.pub -signature <(
  echo "$ENVELOPE" | jq -r '.signatures[0].sig' | base64 -d
) <(
  echo "$ENVELOPE" | jq -r '.payload' | base64 -d
)

# Verify CAR archive
ipfs dag get ${latestCarCID}
\`\`\`

## Trust Anchors
- **GitHub Actions**: Signed by \`github.com/anthropics/pure-lambda/.github/workflows\`
- **Local Development**: Signed by \`PL_ED25519_SECRET\` environment variable
- **CAR Archives**: Daily snapshots with IPLD DAG verification

## Chain of Trust
\`\`\`
Public Key (Ed25519)
    ↓
DSSE Envelopes (daily digests)
    ↓
Hash Chain (prevEnvelopeHash)
    ↓
CAR Archives (IPFS CIDs)
    ↓
Seed Receipts (per-seed attestation)
\`\`\`

## Contact
- **Repository**: https://github.com/anthropics/pure-lambda
- **Issues**: https://github.com/anthropics/pure-lambda/issues

---
*Generated: ${new Date().toISOString()}*
*Notary Version: 1.0.0*
`;

  // Save NOTARY.md
  const notaryPath = path.join(projectRoot, outPath);
  fs.mkdirSync(path.dirname(notaryPath), { recursive: true });
  fs.writeFileSync(notaryPath, notaryContent);

  console.log(`\n✅ Notary document: ${outPath}`);
  console.log(`  Fingerprint: ${pubKeyFingerprint.slice(0, 20)}...`);
  console.log(`  Chain length: ${envelopeHashes.length} hashes`);
  console.log(`  Latest CID: ${latestCarCID.slice(0, 20)}...`);

  return {
    pubKeyFingerprint,
    envelopeHashes,
    latestCarCID
  };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = {};
  process.argv.slice(2).forEach((arg, i, arr) => {
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      args[key] = arr[i + 1] || true;
    }
  });

  generateNotary(args.pub, args.out);
}

export { generateNotary };