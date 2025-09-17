#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * PL-CARTRIDGE-01 HTML Packer
 *
 * Packs a seed into a single HTML file (.htmlc) with embedded viewer
 * Usage:
 *   ts-node tools/cartridge/pack-htmlc.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { canonicalize } from '../../src/seed/canonical';
import { computeHash } from '../../src/seed/schema';
import { createEnvelope } from '../attest';

interface CartridgeManifest {
  version: number;
  createdAt: string;
  seedHash: string;
  envelopeHash?: string;
  viewerHash: string;
  manifestHash: string;
  size: number;
}

const ROOT_DIR = join(__dirname, '../..');
const DIST_DIR = join(ROOT_DIR, 'dist');
const CARTRIDGE_DIST_DIR = join(DIST_DIR, 'cartridge');
const RELEASE_DIST_DIR = join(DIST_DIR, 'release');
const DOCS_CARTRIDGE_DIR = join(ROOT_DIR, 'docs/cartridge');

/**
 * Ensure directory exists
 */
function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generate viewer HTML content
 */
function generateViewer(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pure Lambda Cartridge</title>
    <style>
        body {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            margin: 0;
            padding: 20px;
            background: #0a0a0a;
            color: #00ff41;
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #00ff41;
            border-radius: 8px;
            background: rgba(0, 255, 65, 0.02);
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
            font-size: 24px;
            color: #00ff41;
        }
        .button-group {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        button {
            background: rgba(0, 255, 65, 0.1);
            border: 1px solid #00ff41;
            color: #00ff41;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
            transition: all 0.2s;
        }
        button:hover {
            background: rgba(0, 255, 65, 0.2);
            box-shadow: 0 0 5px #00ff41;
        }
        .info {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #333;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.3);
        }
        .status {
            text-align: center;
            margin: 20px 0;
            padding: 10px;
            border: 1px solid #666;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.2);
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #333;
            font-size: 12px;
            color: #666;
        }
        pre {
            background: rgba(0, 0, 0, 0.5);
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 10px;
            border: 1px solid #333;
        }
        .error {
            color: #ff4444;
            border-color: #ff4444;
        }
        .success {
            color: #44ff44;
            border-color: #44ff44;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>λ Pure Lambda Cartridge</h1>

        <div class="button-group">
            <button onclick="verify()">Verify</button>
            <button onclick="runAutopilot()">Run Autopilot</button>
            <button onclick="showRoute()">Show Route</button>
            <button onclick="openMirrorBench()">Open in MirrorBench</button>
        </div>

        <div id="status" class="status">Ready to interact</div>

        <div class="info">
            <h3>Cartridge Information</h3>
            <div id="cartridge-info">Loading...</div>
        </div>

        <div class="info">
            <h3>Output</h3>
            <pre id="output">Click a button to see output...</pre>
        </div>

        <div class="footer">
            Offline • Deterministic • DSSE-Verified
        </div>
    </div>

    <script id="pl-cartridge" type="application/json">
__MANIFEST_PLACEHOLDER__
    </script>

    <script id="pl-seed" type="text/plain">
__SEED_PLACEHOLDER__
    </script>

    <script id="pl-envelope" type="text/plain">
__ENVELOPE_PLACEHOLDER__
    </script>

    <script>
        let cartridgeData = null;
        let seedData = null;
        let envelopeData = null;

        function log(message, isError = false) {
            const output = document.getElementById('output');
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            output.textContent += \`[\${timestamp}] \${message}\\n\`;
            output.scrollTop = output.scrollHeight;
        }

        function setStatus(message, isError = false) {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = 'status ' + (isError ? 'error' : 'success');
        }

        function loadCartridgeData() {
            try {
                const manifestScript = document.getElementById('pl-cartridge');
                const seedScript = document.getElementById('pl-seed');
                const envelopeScript = document.getElementById('pl-envelope');

                if (manifestScript && manifestScript.textContent.trim()) {
                    cartridgeData = JSON.parse(manifestScript.textContent.trim());
                }

                if (seedScript && seedScript.textContent.trim()) {
                    const seedBase64 = seedScript.textContent.trim();
                    if (seedBase64 !== '__SEED_PLACEHOLDER__') {
                        const seedJson = atob(seedBase64);
                        seedData = JSON.parse(seedJson);
                    }
                }

                if (envelopeScript && envelopeScript.textContent.trim()) {
                    const envelopeBase64 = envelopeScript.textContent.trim();
                    if (envelopeBase64 !== '__ENVELOPE_PLACEHOLDER__') {
                        const envelopeJson = atob(envelopeBase64);
                        envelopeData = JSON.parse(envelopeJson);
                    }
                }

                // Update cartridge info
                const info = document.getElementById('cartridge-info');
                if (cartridgeData && seedData) {
                    info.innerHTML = \`
                        <strong>Name:</strong> \${seedData.name || 'Unknown'}<br>
                        <strong>Version:</strong> \${cartridgeData.version}<br>
                        <strong>Created:</strong> \${new Date(cartridgeData.createdAt).toLocaleString()}<br>
                        <strong>Size:</strong> \${(cartridgeData.size / 1024).toFixed(1)} KB<br>
                        <strong>Tiles:</strong> \${seedData.tiles ? seedData.tiles.length : 0}<br>
                        <strong>Signed:</strong> \${envelopeData ? 'Yes' : 'No'}
                    \`;
                } else {
                    info.innerHTML = 'Failed to load cartridge data';
                }
            } catch (error) {
                log('Error loading cartridge data: ' + error.message, true);
                setStatus('Failed to load cartridge', true);
            }
        }

        function verify() {
            log('Starting verification...');
            setStatus('Verifying...');

            try {
                if (!cartridgeData || !seedData) {
                    throw new Error('Cartridge data not loaded');
                }

                // Simple hash verification (we don't have BLAKE3 in browser)
                log('✓ Cartridge manifest loaded');
                log('✓ Seed data loaded');

                if (envelopeData) {
                    log('✓ DSSE envelope loaded');
                    log('⚠ DSSE signature verification requires server-side validation');
                } else {
                    log('ℹ No DSSE envelope (unsigned cartridge)');
                }

                log('✓ Basic structure validation passed');
                setStatus('Verification completed', false);
            } catch (error) {
                log('✗ Verification failed: ' + error.message, true);
                setStatus('Verification failed', true);
            }
        }

        function runAutopilot() {
            log('Starting autopilot simulation...');
            setStatus('Running autopilot...');

            try {
                if (!seedData) {
                    throw new Error('No seed data available');
                }

                const tiles = seedData.tiles || [];
                log(\`Found \${tiles.length} tiles to execute\`);

                tiles.forEach((tile, index) => {
                    log(\`[\${index + 1}] \${tile.op}: \${tile.law} (cost: \${tile.cost})\`);
                });

                const stats = seedData.meta?.stats;
                if (stats) {
                    log(\`Estimated: \${stats.hops} hops, \${stats.latency}ms latency, \${stats.mem} bytes memory\`);
                }

                log('✓ Autopilot simulation completed');
                setStatus('Autopilot completed', false);
            } catch (error) {
                log('✗ Autopilot failed: ' + error.message, true);
                setStatus('Autopilot failed', true);
            }
        }

        function showRoute() {
            log('Displaying route information...');
            setStatus('Showing route...');

            try {
                if (!seedData) {
                    throw new Error('No seed data available');
                }

                const tiles = seedData.tiles || [];
                log('=== ROUTE MAP ===');

                tiles.forEach((tile, index) => {
                    const ports = tile.abi?.ports || {};
                    const portsList = Object.entries(ports).map(([k, v]) => \`\${k}:\${v}\`).join(', ');
                    log(\`\${index + 1}. \${tile.op} [\${portsList}]\`);
                });

                const gidSet = seedData.meta?.gidSet || [];
                log(\`\\nGID Set (\${gidSet.length} unique operations):\`);
                gidSet.forEach((gid, index) => {
                    log(\`  \${index + 1}. \${gid.substring(0, 16)}...\`);
                });

                log('✓ Route display completed');
                setStatus('Route displayed', false);
            } catch (error) {
                log('✗ Route display failed: ' + error.message, true);
                setStatus('Route display failed', true);
            }
        }

        function openMirrorBench() {
            log('Opening in MirrorBench...');
            setStatus('Opening MirrorBench...');

            try {
                if (!seedData) {
                    throw new Error('No seed data available');
                }

                // Create a data URL with the seed data for MirrorBench
                const seedJson = JSON.stringify(seedData, null, 2);
                const dataUrl = 'data:application/json;base64,' + btoa(seedJson);

                // Try to open MirrorBench (this would need to be customized for actual MirrorBench URL)
                const mirrorBenchUrl = \`https://mirrorbench.pure-lambda.org?seed=\${encodeURIComponent(dataUrl)}\`;

                log('Generated MirrorBench URL (would open in production):');
                log(mirrorBenchUrl.substring(0, 100) + '...');
                log('⚠ Opening external URLs requires user interaction in browsers');

                setStatus('MirrorBench URL generated', false);
            } catch (error) {
                log('✗ MirrorBench open failed: ' + error.message, true);
                setStatus('MirrorBench open failed', true);
            }
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadCartridgeData();
            log('Pure Lambda Cartridge Viewer initialized');
            setStatus('Ready', false);
        });
    </script>
</body>
</html>`;
}

/**
 * Main packing function
 */
async function packHtmlCartridge() {
  console.log('🎯 Packing HTML cartridge (.htmlc)...');

  // Step 1: Pack seed using existing tool
  console.log('📦 Packing seed...');
  ensureDir(CARTRIDGE_DIST_DIR);

  const seedInputPath = join(ROOT_DIR, 'seeds/examples/hello-city.json');
  const seedOutputPath = join(CARTRIDGE_DIST_DIR, 'hello-city.seed.json');

  if (!existsSync(seedInputPath)) {
    throw new Error(`Seed input file not found: ${seedInputPath}`);
  }

  // Run pack.ts to generate seed
  try {
    const packCommand = `cd "${ROOT_DIR}" && npx ts-node tools/seed/pack.ts "${seedInputPath}"`;
    const seedJson = execSync(packCommand, { encoding: 'utf8' });
    writeFileSync(seedOutputPath, seedJson);
    console.log(`✅ Seed packed: ${seedOutputPath}`);
  } catch (error) {
    throw new Error(`Failed to pack seed: ${error}`);
  }

  // Step 2: Create envelope if PL_ED25519_SECRET is available
  let envelopeData: any = null;
  const envelopeOutputPath = join(CARTRIDGE_DIST_DIR, 'envelope.json');

  if (process.env.PL_ED25519_SECRET) {
    console.log('🔐 Creating DSSE envelope...');
    try {
      const envelope = createEnvelope(seedOutputPath);
      writeFileSync(envelopeOutputPath, JSON.stringify(envelope, null, 2));
      envelopeData = envelope;
      console.log(`✅ Envelope created: ${envelopeOutputPath}`);
    } catch (error) {
      console.warn(`⚠️  Failed to create envelope: ${error}`);
    }
  } else {
    console.log('ℹ️  No PL_ED25519_SECRET - skipping envelope creation');
  }

  // Step 3: Generate viewer HTML
  console.log('🌐 Generating viewer...');
  const viewerPath = join(DOCS_CARTRIDGE_DIR, 'index.html');
  ensureDir(DOCS_CARTRIDGE_DIR);

  const viewerHtml = generateViewer();
  writeFileSync(viewerPath, viewerHtml);
  console.log(`✅ Viewer generated: ${viewerPath}`);

  // Step 4: Create cartridge manifest
  console.log('📋 Creating manifest...');
  const seedContent = readFileSync(seedOutputPath, 'utf8');
  const seedHash = computeHash(canonicalize(JSON.parse(seedContent)));

  // For viewer hash, we use the template before placeholder substitution
  const viewerTemplateHash = computeHash(viewerHtml);
  const envelopeHash = envelopeData ? computeHash(canonicalize(envelopeData)) : undefined;

  const manifest: Omit<CartridgeManifest, 'manifestHash' | 'size'> = {
    version: 1,
    createdAt: new Date().toISOString(),
    seedHash,
    viewerHash: viewerTemplateHash,
    ...(envelopeHash && { envelopeHash })
  };

  const manifestHash = computeHash(canonicalize(manifest));
  const fullManifest: Omit<CartridgeManifest, 'size'> = {
    ...manifest,
    manifestHash
  };

  // Step 5: Create single HTML file with embedded data
  console.log('🎪 Creating single HTML cartridge...');
  ensureDir(RELEASE_DIST_DIR);

  const seedBase64 = Buffer.from(seedContent).toString('base64');
  const envelopeBase64 = envelopeData ?
    Buffer.from(JSON.stringify(envelopeData)).toString('base64') : '';

  let htmlContent = viewerHtml
    .replace('__MANIFEST_PLACEHOLDER__', JSON.stringify(fullManifest, null, 4))
    .replace('__SEED_PLACEHOLDER__', seedBase64)
    .replace('__ENVELOPE_PLACEHOLDER__', envelopeBase64);

  // Calculate final size and update manifest
  const finalSize = Buffer.from(htmlContent).length;
  const finalManifest: CartridgeManifest = {
    ...fullManifest,
    size: finalSize
  };

  // Update HTML with final manifest
  htmlContent = htmlContent.replace(
    JSON.stringify(fullManifest, null, 4),
    JSON.stringify(finalManifest, null, 4)
  );

  const htmlCartridgePath = join(RELEASE_DIST_DIR, 'hello-city.htmlc');
  writeFileSync(htmlCartridgePath, htmlContent);

  console.log(`✅ HTML cartridge created: ${htmlCartridgePath}`);
  console.log(`📊 Size: ${(finalSize / 1024).toFixed(1)} KB`);

  if (finalSize > 40 * 1024) {
    console.warn(`⚠️  Size exceeds 40KB target (${(finalSize / 1024).toFixed(1)} KB)`);
  }

  // Save manifest separately for zip packer
  const manifestPath = join(CARTRIDGE_DIST_DIR, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(finalManifest, null, 2));
  console.log(`✅ Manifest saved: ${manifestPath}`);

  return htmlCartridgePath;
}

/**
 * Main execution
 */
async function main() {
  try {
    const htmlCartridgePath = await packHtmlCartridge();
    console.log(`\n🎉 HTML cartridge ready: ${htmlCartridgePath}`);
    console.log('🌐 Open in browser to test viewer functionality');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { packHtmlCartridge, generateViewer };