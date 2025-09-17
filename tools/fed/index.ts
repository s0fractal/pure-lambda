#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * PL-FED-01 Federation Hub API Generator
 *
 * Generates offline federation hub web interface
 * Usage:
 *   ts-node tools/fed/index.ts
 *   ts-node tools/fed/index.ts --output custom-dir
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface GeneratorOptions {
  outputDir?: string | undefined;
  title?: string | undefined;
}

/**
 * Generate the main HTML page
 */
function generateHTML(title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            color: white;
        }

        .header h1 {
            font-size: 3rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }

        .main-panel {
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
        }

        .drop-zone {
            padding: 60px 40px;
            border: 3px dashed #ddd;
            border-radius: 10px;
            margin: 30px;
            text-align: center;
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .drop-zone:hover,
        .drop-zone.dragover {
            border-color: #667eea;
            background: #f8f9ff;
        }

        .drop-zone.processing {
            border-color: #28a745;
            background: #f0f8f0;
        }

        .drop-zone h2 {
            color: #666;
            margin-bottom: 15px;
            font-size: 1.5rem;
        }

        .drop-zone p {
            color: #999;
            font-size: 1rem;
        }

        .controls {
            padding: 20px 30px;
            background: #f8f9fa;
            border-top: 1px solid #eee;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: center;
        }

        .btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-block;
        }

        .btn:hover {
            background: #5a6fd8;
            transform: translateY(-1px);
        }

        .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }

        .btn.secondary {
            background: #6c757d;
        }

        .btn.secondary:hover {
            background: #5a6268;
        }

        .btn.success {
            background: #28a745;
        }

        .btn.success:hover {
            background: #218838;
        }

        .federation-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px;
            margin-top: 0;
        }

        .federation-table th,
        .federation-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }

        .federation-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #555;
        }

        .federation-table tr:hover {
            background: #f8f9ff;
        }

        .hash-display {
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            color: #666;
        }

        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .badge.dsse-valid {
            background: #28a745;
            color: white;
        }

        .badge.dsse-invalid {
            background: #dc3545;
            color: white;
        }

        .badge.dsse-none {
            background: #6c757d;
            color: white;
        }

        .badge.status-ok {
            background: #28a745;
            color: white;
        }

        .badge.status-quarantine {
            background: #ffc107;
            color: #333;
        }

        .trust-score {
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 4px;
            color: white;
        }

        .trust-excellent { background: #28a745; }
        .trust-good { background: #17a2b8; }
        .trust-fair { background: #ffc107; color: #333; }
        .trust-poor { background: #fd7e14; }
        .trust-untrusted { background: #dc3545; }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px;
            margin-bottom: 0;
        }

        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }

        .stat-card h3 {
            color: #667eea;
            font-size: 2rem;
            margin-bottom: 5px;
        }

        .stat-card p {
            color: #666;
            font-size: 0.9rem;
        }

        .hidden {
            display: none;
        }

        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 30px;
            border: 1px solid #f5c6cb;
        }

        .success-message {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 30px;
            border: 1px solid #c3e6cb;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }

        .loading::after {
            content: '';
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #ddd;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏛️ Federation Hub</h1>
            <p>Pure Lambda Federation Browser - Offline & Secure</p>
        </div>

        <div class="main-panel">
            <div id="dropZone" class="drop-zone">
                <h2>📦 Drop Federation Files</h2>
                <p>Drag & drop .fed.zip bundles, .htmlc cartridges, .cartridge files, or .seed.json files</p>
                <input type="file" id="fileInput" multiple accept=".zip,.fed.zip,.htmlc,.cartridge,.json" style="display: none;">
            </div>

            <div id="errorMessage" class="error-message hidden"></div>
            <div id="successMessage" class="success-message hidden"></div>
            <div id="loadingMessage" class="loading hidden">Processing files</div>

            <div id="stats" class="stats hidden"></div>

            <table id="federationTable" class="federation-table hidden">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Hash</th>
                        <th>DSSE</th>
                        <th>Trust</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="federationTableBody">
                </tbody>
            </table>

            <div class="controls">
                <button id="clearBtn" class="btn secondary">🗑️ Clear</button>
                <button id="exportBtn" class="btn success" disabled>📦 Export Bundle</button>
                <button id="importBtn" class="btn">📁 Import to Vault</button>
                <span style="margin-left: auto; color: #666; font-size: 0.9rem;">
                    <strong>PL-FED-01</strong> | Offline Federation Hub
                </span>
            </div>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>`;
}

/**
 * Generate the main JavaScript application
 */
function generateJS(): string {
  return `// PL-FED-01 Federation Hub App
// Offline federation browser with drag & drop support

class FederationHub {
    constructor() {
        this.federationData = null;
        this.seedsData = new Map();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const clearBtn = document.getElementById('clearBtn');
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');

        // Drag & drop
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // File input
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Controls
        clearBtn.addEventListener('click', () => this.clearData());
        exportBtn.addEventListener('click', () => this.exportBundle());
        importBtn.addEventListener('click', () => this.showImportCommand());
    }

    async handleFiles(files) {
        this.showLoading(true);
        this.hideMessages();

        try {
            let processedCount = 0;

            for (const file of files) {
                if (file.name.endsWith('.fed.zip') || file.name.endsWith('.zip')) {
                    await this.processFederationBundle(file);
                    processedCount++;
                } else if (file.name.endsWith('.htmlc') ||
                          file.name.endsWith('.cartridge') ||
                          file.name.endsWith('.seed.json')) {
                    await this.processSeedFile(file);
                    processedCount++;
                } else {
                    this.showError(\`Unsupported file type: \${file.name}\`);
                }
            }

            if (processedCount > 0) {
                this.showSuccess(\`Successfully processed \${processedCount} file(s)\`);
                this.updateUI();
            }
        } catch (error) {
            this.showError(\`Error processing files: \${error.message}\`);
        } finally {
            this.showLoading(false);
        }
    }

    async processFederationBundle(file) {
        // For now, just extract the manifest and process as JSON
        // In a real implementation, you'd use JSZip or similar
        this.showError('Federation bundle processing not yet implemented (requires JSZip)');
    }

    async processSeedFile(file) {
        try {
            const content = await this.readFileContent(file);

            if (file.name.endsWith('.seed.json')) {
                const seedData = JSON.parse(content);
                this.addSeed(seedData);
            } else {
                // For .htmlc and .cartridge, we'd need to extract the seed
                this.showError('Cartridge processing not yet implemented');
            }
        } catch (error) {
            throw new Error(\`Failed to process \${file.name}: \${error.message}\`);
        }
    }

    addSeed(seedData) {
        // Basic validation
        if (!seedData.pl_seed || seedData.pl_seed !== 'PL-SEED-01') {
            throw new Error('Invalid seed format');
        }

        // Calculate hash (simplified - in reality, use canonical JSON + BLAKE3)
        const hash = this.calculateSimpleHash(JSON.stringify(seedData));

        // Store seed
        this.seedsData.set(hash, {
            name: seedData.name,
            hash: hash,
            gidSet: seedData.meta?.gidSet || [],
            iidSet: seedData.meta?.iidSet || [],
            xidSet: seedData.meta?.xidSet || [],
            dsse: { present: false, valid: false },
            source: { kind: 'seed', file: 'uploaded' },
            data: seedData
        });

        // Update or create federation manifest
        this.updateFederationManifest();
    }

    updateFederationManifest() {
        const seeds = Array.from(this.seedsData.values());

        // Calculate trust score
        const dsseValid = seeds.filter(s => s.dsse.valid).length;
        const conformant = seeds.length;
        const trustScore = seeds.length > 0 ? (0.4 * (conformant / seeds.length) + 0.2 * 1.0) : 0;

        this.federationData = {
            pl_fed: 'PL-FED-01',
            version: 1,
            createdAt: new Date().toISOString(),
            seeds: seeds,
            trust: {
                score: Math.round(trustScore * 1000) / 1000,
                stats: {
                    dsseValid: dsseValid,
                    conformant: conformant,
                    ageMedian: '0'
                }
            },
            quarantine: []
        };
    }

    calculateSimpleHash(data) {
        // Simple hash for demo - in reality use BLAKE3
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0').repeat(8);
    }

    updateUI() {
        if (!this.federationData || this.federationData.seeds.length === 0) {
            document.getElementById('stats').classList.add('hidden');
            document.getElementById('federationTable').classList.add('hidden');
            document.getElementById('exportBtn').disabled = true;
            return;
        }

        this.updateStats();
        this.updateTable();
        document.getElementById('stats').classList.remove('hidden');
        document.getElementById('federationTable').classList.remove('hidden');
        document.getElementById('exportBtn').disabled = false;
    }

    updateStats() {
        const stats = this.federationData.trust.stats;
        const trustScore = this.federationData.trust.score;
        const trustLevel = this.getTrustLevel(trustScore);

        document.getElementById('stats').innerHTML = \`
            <div class="stat-card">
                <h3>\${this.federationData.seeds.length}</h3>
                <p>Total Seeds</p>
            </div>
            <div class="stat-card">
                <h3>\${stats.dsseValid}</h3>
                <p>DSSE Valid</p>
            </div>
            <div class="stat-card">
                <h3 class="trust-\${trustLevel.toLowerCase().replace(' ', '-')}">\${trustScore.toFixed(3)}</h3>
                <p>Trust Score (\${trustLevel})</p>
            </div>
            <div class="stat-card">
                <h3>\${this.federationData.quarantine?.length || 0}</h3>
                <p>Quarantined</p>
            </div>
        \`;
    }

    updateTable() {
        const tbody = document.getElementById('federationTableBody');
        tbody.innerHTML = '';

        for (const seed of this.federationData.seeds) {
            const isQuarantined = this.federationData.quarantine?.some(q => q.hash === seed.hash);
            const trustScore = this.federationData.trust.score;
            const trustLevel = this.getTrustLevel(trustScore);

            const row = document.createElement('tr');
            row.innerHTML = \`
                <td><strong>\${seed.name}</strong></td>
                <td><code class="hash-display">\${seed.hash.slice(0, 12)}...</code></td>
                <td>
                    <span class="badge dsse-\${seed.dsse.present ? (seed.dsse.valid ? 'valid' : 'invalid') : 'none'}">
                        \${seed.dsse.present ? (seed.dsse.valid ? 'Valid' : 'Invalid') : 'None'}
                    </span>
                </td>
                <td>
                    <span class="trust-score trust-\${trustLevel.toLowerCase().replace(' ', '-')}">
                        \${trustScore.toFixed(3)}
                    </span>
                </td>
                <td>
                    <span class="badge status-\${isQuarantined ? 'quarantine' : 'ok'}">
                        \${isQuarantined ? 'Quarantine' : 'OK'}
                    </span>
                </td>
                <td>
                    <button class="btn" onclick="app.openInMirrorBench('\${seed.name}')">
                        🔍 MirrorBench
                    </button>
                </td>
            \`;
            tbody.appendChild(row);
        }
    }

    getTrustLevel(score) {
        if (score >= 0.9) return 'Excellent';
        if (score >= 0.7) return 'Good';
        if (score >= 0.5) return 'Fair';
        if (score >= 0.3) return 'Poor';
        return 'Untrusted';
    }

    openInMirrorBench(seedName) {
        const url = \`#seed=\${encodeURIComponent(seedName)}\`;
        window.location.hash = url;
        this.showSuccess(\`MirrorBench URL updated: \${window.location.href}\`);
    }

    exportBundle() {
        if (!this.federationData) return;

        const bundleData = {
            manifest: this.federationData,
            seeds: {}
        };

        // Add seed data
        for (const seed of this.federationData.seeds) {
            const seedData = this.seedsData.get(seed.hash);
            if (seedData?.data) {
                bundleData.seeds[seed.hash] = seedData.data;
            }
        }

        // Create downloadable bundle
        const blob = new Blob([JSON.stringify(bundleData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'federation-bundle.fed.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showSuccess('Federation bundle exported successfully');
    }

    showImportCommand() {
        if (!this.federationData || this.federationData.seeds.length === 0) {
            this.showError('No federation data to import');
            return;
        }

        const commands = this.federationData.seeds.map(seed =>
            \`# Copy \${seed.name} to vault\\ncp "\${seed.source.file}" vault/fed/\${seed.hash}.seed.json\`
        ).join('\\n\\n');

        const command = \`# Import Federation Seeds to Vault\\nmkdir -p vault/fed\\n\\n\${commands}\`;

        // Create modal or copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(command).then(() => {
                this.showSuccess('Import commands copied to clipboard');
            });
        } else {
            alert('Import commands:\\n\\n' + command);
        }
    }

    clearData() {
        this.federationData = null;
        this.seedsData.clear();
        this.updateUI();
        this.hideMessages();
        document.getElementById('fileInput').value = '';
        this.showSuccess('Data cleared successfully');
    }

    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    showLoading(show) {
        const element = document.getElementById('loadingMessage');
        if (show) {
            element.classList.remove('hidden');
            document.getElementById('dropZone').classList.add('processing');
        } else {
            element.classList.add('hidden');
            document.getElementById('dropZone').classList.remove('processing');
        }
    }

    showError(message) {
        const element = document.getElementById('errorMessage');
        element.textContent = message;
        element.classList.remove('hidden');
        setTimeout(() => this.hideMessages(), 5000);
    }

    showSuccess(message) {
        const element = document.getElementById('successMessage');
        element.textContent = message;
        element.classList.remove('hidden');
        setTimeout(() => this.hideMessages(), 3000);
    }

    hideMessages() {
        document.getElementById('errorMessage').classList.add('hidden');
        document.getElementById('successMessage').classList.add('hidden');
    }
}

// Initialize app
const app = new FederationHub();

// Handle URL hash for MirrorBench integration
window.addEventListener('hashchange', () => {
    if (window.location.hash.startsWith('#seed=')) {
        const seedName = decodeURIComponent(window.location.hash.slice(6));
        console.log('MirrorBench seed selected:', seedName);
    }
});`;
}

/**
 * Generate federation hub files
 */
function generateHub(options: GeneratorOptions = {}): { success: boolean; errors: string[]; outputDir: string } {
  const result = { success: true, errors: [] as string[], outputDir: '' };

  try {
    const outputDir = options.outputDir || 'docs/federation';
    const title = options.title || 'Pure Lambda Federation Hub';

    result.outputDir = outputDir;

    // Ensure output directory exists
    mkdirSync(outputDir, { recursive: true });

    // Generate files
    const htmlContent = generateHTML(title);
    const jsContent = generateJS();

    // Write files
    writeFileSync(join(outputDir, 'index.html'), htmlContent);
    writeFileSync(join(outputDir, 'app.js'), jsContent);

    console.log(`\n=== Federation Hub Generated ===`);
    console.log(`Output: ${outputDir}/`);
    console.log(`Files: index.html, app.js`);
    console.log(`Ready for offline use`);

  } catch (error) {
    result.errors.push(`Hub generation failed: ${error instanceof Error ? error.message : error}`);
    result.success = false;
  }

  return result;
}

/**
 * Print help message
 */
function printHelp() {
  console.log('PL-FED-01 Federation Hub Generator');
  console.log('');
  console.log('Usage:');
  console.log('  ts-node tools/fed/index.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  --output <dir>         Output directory (default: docs/federation)');
  console.log('  --title <title>        Page title (default: Pure Lambda Federation Hub)');
  console.log('  --help, -h             Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  ts-node tools/fed/index.ts');
  console.log('  ts-node tools/fed/index.ts --output custom-hub');
  console.log('  ts-node tools/fed/index.ts --title "My Federation Hub"');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const options: GeneratorOptions = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--output' && i + 1 < args.length) {
      const value = args[++i];
      if (value) options.outputDir = value;
    } else if (arg === '--title' && i + 1 < args.length) {
      const value = args[++i];
      if (value) options.title = value;
    } else if (arg?.startsWith('--')) {
      console.error(`Error: Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  try {
    const result = generateHub(options);

    if (result.errors.length > 0) {
      console.error('\nErrors:');
      for (const error of result.errors) {
        console.error(`  ❌ ${error}`);
      }
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Hub generation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { generateHub };
export type { GeneratorOptions };