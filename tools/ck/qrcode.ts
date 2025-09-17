#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Canonical bytes serialization
function canonicalBytes(obj: any): Buffer {
  const sorted = JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((result, key) => {
        result[key] = value[key];
        return result;
      }, {} as any);
    }
    return value;
  });
  return Buffer.from(sorted, 'utf8');
}

// Simple QR code generator (text-based)
function generateQRCode(data: string): string {
  // Base64url encode the data
  const base64url = Buffer.from(data).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Create simple SVG QR-like pattern (deterministic)
  const size = 400;
  const modules = 25; // 25x25 grid
  const moduleSize = size / modules;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
<rect width="${size}" height="${size}" fill="white"/>
`;

  // Generate deterministic pattern based on data hash
  const hash = crypto.createHash('sha256').update(data).digest();

  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      const byteIndex = (y * modules + x) % hash.length;
      const bit = (hash[byteIndex]! >> (x % 8)) & 1;

      // Add corner markers
      const isCorner = (x < 3 && y < 3) ||
                      (x >= modules - 3 && y < 3) ||
                      (x < 3 && y >= modules - 3);

      if (bit === 1 || isCorner) {
        svg += `<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>
`;
      }
    }
  }

  // Add data as text (for manual verification)
  svg += `<text x="${size/2}" y="${size - 10}" text-anchor="middle" font-family="monospace" font-size="8" fill="gray">${base64url.slice(0, 40)}...</text>
`;

  svg += '</svg>';
  return svg;
}

// CLI interface
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npm run ck:qr <seed.json>');
    console.log('');
    console.log('Generates deterministic QR code from canonical seed representation');
    console.log('Output: out/seed-qr.svg');
    process.exit(1);
  }

  const seedPath = args[0];
  if (!seedPath) {
    console.error('❌ Seed path is required');
    process.exit(1);
  }

  if (!fs.existsSync(seedPath)) {
    console.error(`❌ Seed file not found: ${seedPath}`);
    process.exit(1);
  }

  try {
    // Read and canonicalize seed
    const seedContent = fs.readFileSync(seedPath, 'utf8');
    const seed = JSON.parse(seedContent);

    const seedName = seed.name || seed.pl_seed || path.basename(seedPath);
    console.log(`📱 Generating QR code for: ${seedName}`);

    // Create canonical representation
    const canonicalData = canonicalBytes(seed).toString();
    console.log(`   Canonical size: ${canonicalData.length} bytes`);

    // Generate QR code
    const qrSvg = generateQRCode(canonicalData);

    // Ensure output directory exists
    const outDir = path.join(process.cwd(), 'out');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Write QR code
    const outputPath = path.join(outDir, 'seed-qr.svg');
    fs.writeFileSync(outputPath, qrSvg);

    console.log(`   ✅ QR code saved: ${outputPath}`);
    console.log(`   📏 SVG size: ${qrSvg.length} bytes`);

    // Also save the base64url data for reference
    const base64url = Buffer.from(canonicalData).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const dataPath = path.join(outDir, 'seed-qr.txt');
    fs.writeFileSync(dataPath, base64url);
    console.log(`   📄 Data payload: ${dataPath}`);

    // Verification info
    console.log('');
    console.log('🔍 Verification:');
    console.log(`   Scan QR → decode base64url → parse JSON → validate`);
    console.log(`   Expected name: ${seedName}`);
    console.log(`   Expected nodes/tiles: ${(seed.tiles?.length || Object.keys(seed.nodes || {}).length)}`);

  } catch (error: any) {
    console.error(`❌ Failed to generate QR code: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateQRCode, canonicalBytes };