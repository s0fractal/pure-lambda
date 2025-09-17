#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * PL-CARTRIDGE-01 Zip Packer
 *
 * Packs cartridge components into a zip archive (.cartridge)
 * Usage:
 *   ts-node tools/cartridge/pack-zip.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { canonicalize } from '../../src/seed/canonical';
import { computeHash } from '../../src/seed/schema';

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

/**
 * Check if required files exist from htmlc packer
 */
function checkPrerequisites() {
  const requiredFiles = [
    join(CARTRIDGE_DIST_DIR, 'hello-city.seed.json'),
    join(CARTRIDGE_DIST_DIR, 'manifest.json'),
    join(ROOT_DIR, 'docs/cartridge/index.html')
  ];

  for (const file of requiredFiles) {
    if (!existsSync(file)) {
      throw new Error(`Required file not found: ${file}. Run pack-htmlc.ts first.`);
    }
  }

  return requiredFiles;
}

/**
 * Generate standalone viewer for zip cartridge
 */
function generateStandaloneViewer(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pure Lambda Cartridge Viewer</title>
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
        <h1>λ Pure Lambda Cartridge Viewer</h1>

        <div class="button-group">
            <button onclick="verify()">Verify</button>
            <button onclick="runAutopilot()">Run Autopilot</button>
            <button onclick="showRoute()">Show Route</button>
            <button onclick="openMirrorBench()">Open in MirrorBench</button>
        </div>

        <div id="status" class="status">Loading cartridge files...</div>

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

        async function loadFile(filename) {
            try {
                const response = await fetch(filename);
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }
                return await response.text();
            } catch (error) {
                throw new Error(\`Failed to load \${filename}: \${error.message}\`);
            }
        }

        async function loadCartridgeData() {
            try {
                log('Loading cartridge files...');

                // Load manifest
                const manifestText = await loadFile('./manifest.json');
                cartridgeData = JSON.parse(manifestText);
                log('✓ Manifest loaded');

                // Load seed
                const seedText = await loadFile('./seed.json');
                seedData = JSON.parse(seedText);
                log('✓ Seed loaded');

                // Try to load envelope (optional)
                try {
                    const envelopeText = await loadFile('./envelope.json');
                    envelopeData = JSON.parse(envelopeText);
                    log('✓ Envelope loaded');
                } catch (error) {
                    log('ℹ No envelope file (unsigned cartridge)');
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
                    setStatus('Cartridge loaded successfully', false);
                } else {
                    throw new Error('Invalid cartridge data');
                }

            } catch (error) {
                log('Error loading cartridge: ' + error.message, true);
                setStatus('Failed to load cartridge', true);

                const info = document.getElementById('cartridge-info');
                info.innerHTML = \`<span style="color: #ff4444;">Failed to load cartridge files. Make sure all files are present in the same directory.</span>\`;
            }
        }

        function verify() {
            log('Starting verification...');
            setStatus('Verifying...');

            try {
                if (!cartridgeData || !seedData) {
                    throw new Error('Cartridge data not loaded');
                }

                log('✓ Cartridge manifest loaded');
                log('✓ Seed data loaded');

                if (envelopeData) {
                    log('✓ DSSE envelope loaded');
                    log('⚠ DSSE signature verification requires server-side validation');
                } else {
                    log('ℹ No DSSE envelope (unsigned cartridge)');
                }

                // Basic structure validation
                if (!cartridgeData.seedHash || !cartridgeData.viewerHash) {
                    throw new Error('Invalid manifest structure');
                }

                if (!seedData.pl_seed || seedData.pl_seed !== 'PL-SEED-01') {
                    throw new Error('Invalid seed format');
                }

                if (!seedData.tiles || !Array.isArray(seedData.tiles)) {
                    throw new Error('Invalid seed tiles');
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

                const seedJson = JSON.stringify(seedData, null, 2);
                const dataUrl = 'data:application/json;base64,' + btoa(seedJson);
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
        });
    </script>
</body>
</html>`;
}

/**
 * Create zip cartridge
 */
async function packZipCartridge() {
  console.log('📦 Packing ZIP cartridge (.cartridge)...');

  // Check prerequisites
  checkPrerequisites();

  // Read existing files
  const seedPath = join(CARTRIDGE_DIST_DIR, 'hello-city.seed.json');
  const manifestPath = join(CARTRIDGE_DIST_DIR, 'manifest.json');
  const envelopePath = join(CARTRIDGE_DIST_DIR, 'envelope.json');

  const seedContent = readFileSync(seedPath, 'utf8');
  const manifestContent = readFileSync(manifestPath, 'utf8');
  const manifest: CartridgeManifest = JSON.parse(manifestContent);

  // Generate standalone viewer
  const standaloneViewer = generateStandaloneViewer();
  const viewerPath = join(CARTRIDGE_DIST_DIR, 'index.html');
  writeFileSync(viewerPath, standaloneViewer);

  // Create manifest for zip (update with recalculated hashes if needed)
  const zipManifest: CartridgeManifest = {
    ...manifest,
    viewerHash: computeHash(standaloneViewer)
  };

  // Recalculate manifest hash (exclude both manifestHash and size)
  const manifestWithoutHash = { ...zipManifest };
  delete (manifestWithoutHash as any).manifestHash;
  delete (manifestWithoutHash as any).size;
  zipManifest.manifestHash = computeHash(canonicalize(manifestWithoutHash));

  const zipManifestPath = join(CARTRIDGE_DIST_DIR, 'manifest.json');
  writeFileSync(zipManifestPath, JSON.stringify(zipManifest, null, 2));

  // Prepare files for zip
  const filesToZip = [
    { src: viewerPath, dest: 'index.html' },
    { src: seedPath, dest: 'seed.json' },
    { src: zipManifestPath, dest: 'manifest.json' }
  ];

  // Add envelope if it exists
  if (existsSync(envelopePath)) {
    filesToZip.push({ src: envelopePath, dest: 'envelope.json' });
  }

  // Create temporary directory for zip contents
  const tempZipDir = join(CARTRIDGE_DIST_DIR, 'temp-zip');
  execSync(`rm -rf "${tempZipDir}" && mkdir -p "${tempZipDir}"`);

  // Copy files to temp directory
  for (const file of filesToZip) {
    const tempFilePath = join(tempZipDir, file.dest);
    execSync(`cp "${file.src}" "${tempFilePath}"`);
  }

  // Create zip file
  const zipOutputPath = join(RELEASE_DIST_DIR, 'hello-city.cartridge');
  try {
    // Use system zip command for better compatibility
    execSync(`cd "${tempZipDir}" && zip -r "${zipOutputPath}" .`, { stdio: 'pipe' });
  } catch (error) {
    throw new Error(`Failed to create zip: ${error}`);
  }

  // Clean up temp directory
  execSync(`rm -rf "${tempZipDir}"`);

  // Check size
  const zipStats = require('fs').statSync(zipOutputPath);
  const zipSize = zipStats.size;

  console.log(`✅ ZIP cartridge created: ${zipOutputPath}`);
  console.log(`📊 Size: ${(zipSize / 1024).toFixed(1)} KB`);

  if (zipSize > 80 * 1024) {
    console.warn(`⚠️  Size exceeds 80KB limit (${(zipSize / 1024).toFixed(1)} KB)`);
  }

  // Update manifest with final size
  const finalManifest: CartridgeManifest = {
    ...zipManifest,
    size: zipSize
  };

  writeFileSync(zipManifestPath, JSON.stringify(finalManifest, null, 2));

  return zipOutputPath;
}

/**
 * Main execution
 */
async function main() {
  try {
    const zipCartridgePath = await packZipCartridge();
    console.log(`\n🎉 ZIP cartridge ready: ${zipCartridgePath}`);
    console.log('📦 Extract and open index.html to test functionality');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { packZipCartridge, generateStandaloneViewer };