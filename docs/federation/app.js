// PL-FED-01 Federation Hub App
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
                    this.showError(`Unsupported file type: ${file.name}`);
                }
            }

            if (processedCount > 0) {
                this.showSuccess(`Successfully processed ${processedCount} file(s)`);
                this.updateUI();
            }
        } catch (error) {
            this.showError(`Error processing files: ${error.message}`);
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
            throw new Error(`Failed to process ${file.name}: ${error.message}`);
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

        document.getElementById('stats').innerHTML = `
            <div class="stat-card">
                <h3>${this.federationData.seeds.length}</h3>
                <p>Total Seeds</p>
            </div>
            <div class="stat-card">
                <h3>${stats.dsseValid}</h3>
                <p>DSSE Valid</p>
            </div>
            <div class="stat-card">
                <h3 class="trust-${trustLevel.toLowerCase().replace(' ', '-')}">${trustScore.toFixed(3)}</h3>
                <p>Trust Score (${trustLevel})</p>
            </div>
            <div class="stat-card">
                <h3>${this.federationData.quarantine?.length || 0}</h3>
                <p>Quarantined</p>
            </div>
        `;
    }

    updateTable() {
        const tbody = document.getElementById('federationTableBody');
        tbody.innerHTML = '';

        for (const seed of this.federationData.seeds) {
            const isQuarantined = this.federationData.quarantine?.some(q => q.hash === seed.hash);
            const trustScore = this.federationData.trust.score;
            const trustLevel = this.getTrustLevel(trustScore);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${seed.name}</strong></td>
                <td><code class="hash-display">${seed.hash.slice(0, 12)}...</code></td>
                <td>
                    <span class="badge dsse-${seed.dsse.present ? (seed.dsse.valid ? 'valid' : 'invalid') : 'none'}">
                        ${seed.dsse.present ? (seed.dsse.valid ? 'Valid' : 'Invalid') : 'None'}
                    </span>
                </td>
                <td>
                    <span class="trust-score trust-${trustLevel.toLowerCase().replace(' ', '-')}">
                        ${trustScore.toFixed(3)}
                    </span>
                </td>
                <td>
                    <span class="badge status-${isQuarantined ? 'quarantine' : 'ok'}">
                        ${isQuarantined ? 'Quarantine' : 'OK'}
                    </span>
                </td>
                <td>
                    <button class="btn" onclick="app.openInMirrorBench('${seed.name}')">
                        🔍 MirrorBench
                    </button>
                </td>
            `;
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
        const url = `#seed=${encodeURIComponent(seedName)}`;
        window.location.hash = url;
        this.showSuccess(`MirrorBench URL updated: ${window.location.href}`);
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
            `# Copy ${seed.name} to vault\ncp "${seed.source.file}" vault/fed/${seed.hash}.seed.json`
        ).join('\n\n');

        const command = `# Import Federation Seeds to Vault\nmkdir -p vault/fed\n\n${commands}`;

        // Create modal or copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(command).then(() => {
                this.showSuccess('Import commands copied to clipboard');
            });
        } else {
            alert('Import commands:\n\n' + command);
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
});