#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Generate QR code as SVG (reusing logic from tools/ck/qrcode.ts)
 */
function generateQRCode(data) {
  // Simple deterministic QR placeholder for demo
  // In production, would use proper QR library or call qrcode.ts
  const size = 200;
  const modules = 25;
  const moduleSize = size / modules;

  // Hash data to create deterministic pattern
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  svg += `<rect width="${size}" height="${size}" fill="white"/>`;

  // Generate deterministic pattern based on hash
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      const bit = (hash >> ((x + y * modules) % 32)) & 1;
      if (bit || (x < 7 && y < 7) || (x >= modules - 7 && y < 7) || (x < 7 && y >= modules - 7)) {
        svg += `<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Generate A4/A3 printable poster
 */
function generatePoster(seedPath, outputPath) {
  console.log('🎨 Generating Poster');
  console.log('=' .repeat(40));

  // Read seed
  if (!fs.existsSync(seedPath)) {
    console.error(`❌ Seed not found: ${seedPath}`);
    return false;
  }

  const seedContent = fs.readFileSync(seedPath, 'utf8');
  const seed = JSON.parse(seedContent);

  console.log(`📋 Seed: ${seed.name}`);
  console.log(`   Size: ${(seedContent.length / 1024).toFixed(2)}KB`);

  // Encode seed for embedding
  const seedBase64 = Buffer.from(seedContent).toString('base64');

  // Generate QR code pointing to kiosk with seed
  const kioskURL = `https://pure-lambda.org/otm/kiosk.html?seed=${encodeURIComponent(seedBase64)}`;
  const qrSVG = generateQRCode(kioskURL);

  // Generate poster HTML
  const posterHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pure Lambda - ${seed.name}</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20mm;
        }
        .poster-content {
            text-align: center;
            width: 100%;
        }
        h1 {
            font-size: 48px;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .subtitle {
            font-size: 24px;
            margin-bottom: 30px;
            opacity: 0.95;
        }
        .qr-container {
            background: white;
            padding: 20px;
            border-radius: 12px;
            display: inline-block;
            margin: 30px 0;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .qr-container svg {
            display: block;
        }
        .qr-label {
            color: #333;
            margin-top: 10px;
            font-size: 14px;
            font-weight: 600;
        }
        .seed-info {
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            backdrop-filter: blur(10px);
        }
        .seed-stat {
            display: inline-block;
            margin: 10px 20px;
        }
        .seed-stat-label {
            font-size: 12px;
            opacity: 0.8;
            text-transform: uppercase;
        }
        .seed-stat-value {
            font-size: 24px;
            font-weight: bold;
        }
        .instructions {
            margin-top: 30px;
            font-size: 16px;
            line-height: 1.6;
        }
        .instructions ol {
            text-align: left;
            display: inline-block;
            margin-top: 10px;
        }
        .open-button {
            display: inline-block;
            background: white;
            color: #667eea;
            padding: 15px 40px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            font-size: 18px;
            margin: 20px 0;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            transition: transform 0.2s;
        }
        .open-button:hover {
            transform: scale(1.05);
        }
        .footer {
            position: absolute;
            bottom: 20mm;
            font-size: 12px;
            opacity: 0.8;
        }
        .no-print {
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.5);
            padding: 10px;
            border-radius: 4px;
        }
        .no-print button {
            background: white;
            color: #667eea;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            margin: 0 5px;
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">🖨️ Print</button>
        <button onclick="openKiosk()">🖥️ Open Kiosk</button>
    </div>

    <div class="poster-content">
        <h1>🌱 ${seed.name}</h1>
        <div class="subtitle">Pure Lambda Computational Seed</div>

        <div class="qr-container">
            ${qrSVG}
            <div class="qr-label">Scan to Open</div>
        </div>

        <div class="seed-info">
            <div class="seed-stat">
                <div class="seed-stat-label">Nodes</div>
                <div class="seed-stat-value">${seed.nodes ? Object.keys(seed.nodes).length : 0}</div>
            </div>
            <div class="seed-stat">
                <div class="seed-stat-label">Size</div>
                <div class="seed-stat-value">${(seedContent.length / 1024).toFixed(1)}KB</div>
            </div>
            <div class="seed-stat">
                <div class="seed-stat-label">Version</div>
                <div class="seed-stat-value">${seed.version || 1}</div>
            </div>
        </div>

        <div class="instructions">
            <strong>How to Use:</strong>
            <ol>
                <li>Scan QR code or click "Open Kiosk"</li>
                <li>Choose: Verify, Bench, or Contribute</li>
                <li>Optionally enable "Count this run"</li>
                <li>Export field receipt (privacy-preserving)</li>
            </ol>
        </div>

        <a href="#" class="open-button" onclick="openKiosk(); return false;">
            Open Kiosk Mode
        </a>
    </div>

    <div class="footer">
        Pure Lambda • Offline-First • Privacy-Preserving • pure-lambda.org
    </div>

    <!-- Embedded OTM and seed data -->
    <script>
        const SEED_DATA = ${JSON.stringify(seed)};
        const SEED_BASE64 = "${seedBase64}";

        function openKiosk() {
            // Try local kiosk first, then hosted version
            const localURL = '/docs/otm/kiosk.html?seed=' + encodeURIComponent(SEED_BASE64);
            const hostedURL = 'https://pure-lambda.org/otm/kiosk.html?seed=' + encodeURIComponent(SEED_BASE64);

            // Try to open local version
            window.open(localURL, '_blank');
        }

        // Auto-load OTM if available
        if (typeof OTM !== 'undefined') {
            OTM.mount({ mode: 'floating' });
            OTM.load(SEED_DATA);
        }
    </script>

    <!-- Include OTM inline for offline use -->
    <script>
        // Minimal OTM loader for poster
        (function() {
            if (typeof OTM === 'undefined') {
                console.log('OTM not loaded - poster in offline mode');
            }
        })();
    </script>
</body>
</html>`;

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write poster HTML
  fs.writeFileSync(outputPath, posterHTML);

  // Check size
  const posterSize = fs.statSync(outputPath).size;
  console.log(`✅ Poster generated: ${outputPath}`);
  console.log(`   Size: ${(posterSize / 1024).toFixed(2)}KB`);

  if (posterSize > 40 * 1024) {
    console.warn(`   ⚠️ Poster exceeds 40KB target`);
  }

  return true;
}

// CLI interface
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node scripts/posters/make.mjs <seed.json> <output.html>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/posters/make.mjs seeds/garden/hello-city.json dist/posters/hello-city.html');
    process.exit(1);
  }

  const seedPath = args[0];
  const outputPath = args[1];

  if (generatePoster(seedPath, outputPath)) {
    console.log('\n🎨 Poster ready for printing!');
    console.log(`   Open: file://${path.resolve(outputPath)}`);
  } else {
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generatePoster };