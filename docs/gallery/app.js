// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

// Pure Lambda Seed Gallery - Offline SPA
// Plain DOM, no frameworks, M1-friendly

class SeedGallery {
    constructor() {
        this.seedsIndex = null;
        this.currentSeed = null;
        this.currentOperon = null;
        this.operonData = null;

        this.elements = {
            searchInput: document.getElementById('searchInput'),
            statusDiv: document.getElementById('statusDiv'),
            seedsList: document.getElementById('seedsList'),
            seedDetail: document.getElementById('seedDetail'),
            seedTitle: document.getElementById('seedTitle'),
            backButton: document.getElementById('backButton'),
            seedMetadata: document.getElementById('seedMetadata'),
            dagSvg: document.getElementById('dagSvg'),
            openMirrorBench: document.getElementById('openMirrorBench'),
            exportJson: document.getElementById('exportJson'),
            compareWithCurrent: document.getElementById('compareWithCurrent'),
            seedRawData: document.getElementById('seedRawData')
        };

        this.bindEvents();
        this.loadSeeds();
        this.checkOperonData();
    }

    bindEvents() {
        this.elements.searchInput.addEventListener('input', (e) => this.filterSeeds(e.target.value));
        this.elements.backButton.addEventListener('click', () => this.showSeedsList());
        this.elements.openMirrorBench.addEventListener('click', () => this.openInMirrorBench());
        this.elements.exportJson.addEventListener('click', () => this.exportCurrentSeed());
        this.elements.compareWithCurrent.addEventListener('click', () => this.compareWithCurrent());
    }

    async loadSeeds() {
        try {
            this.elements.statusDiv.textContent = 'Loading seeds index...';
            const response = await fetch('../../seeds/index.json');

            if (!response.ok) {
                throw new Error(`Failed to load seeds index: ${response.status}`);
            }

            this.seedsIndex = await response.json();
            this.renderSeedsList();
            const totalSeeds = this.seedsIndex.seeds.length + (this.seedsIndex.garden ? this.seedsIndex.garden.length : 0);
            this.elements.statusDiv.textContent = `Loaded ${totalSeeds} seeds (${this.seedsIndex.seeds.length} canonical + ${this.seedsIndex.garden ? this.seedsIndex.garden.length : 0} garden)`;
        } catch (error) {
            console.error('Error loading seeds:', error);
            this.elements.statusDiv.textContent = `Error: ${error.message}`;
        }
    }

    async checkOperonData() {
        try {
            const response = await fetch('../../dist/operon.json');
            if (response.ok) {
                this.operonData = await response.json();
                this.elements.compareWithCurrent.style.display = 'inline-block';
            }
        } catch (error) {
            // Operon data not available, hide compare button
            console.log('Operon data not available for comparison');
        }
    }

    renderSeedsList() {
        if (!this.seedsIndex) return;

        this.elements.seedsList.innerHTML = '';

        // Add section header for canonical seeds
        if (this.seedsIndex.seeds.length > 0) {
            const canonicalHeader = document.createElement('div');
            canonicalHeader.className = 'section-header';
            canonicalHeader.innerHTML = '<h2>Canonical Seeds</h2>';
            this.elements.seedsList.appendChild(canonicalHeader);

            this.seedsIndex.seeds.forEach(seed => {
                const seedCard = this.createSeedCard(seed);
                this.elements.seedsList.appendChild(seedCard);
            });
        }

        // Add section header for garden seeds
        if (this.seedsIndex.garden && this.seedsIndex.garden.length > 0) {
            const gardenHeader = document.createElement('div');
            gardenHeader.className = 'section-header';
            gardenHeader.innerHTML = '<h2>🌱 Garden Seeds</h2><p class="section-description">Canonical patterns for Pure Lambda conformance testing</p>';
            this.elements.seedsList.appendChild(gardenHeader);

            this.seedsIndex.garden.forEach(seed => {
                const seedCard = this.createSeedCard(seed);
                seedCard.classList.add('garden-seed');
                this.elements.seedsList.appendChild(seedCard);
            });
        }
    }

    createSeedCard(seed) {
        const card = document.createElement('div');
        card.className = 'seed-card';

        const patternInfo = seed.pattern ? `<p class="pattern">Pattern: ${seed.pattern}</p>` : '';

        card.innerHTML = `
            <h3>${seed.name}</h3>
            <p class="category">${seed.category}</p>
            <p class="description">${seed.description}</p>
            ${patternInfo}
            <div class="metrics">
                <span>Nodes: ${seed.expectedMetrics.nodeCount}</span>
                <span>Min Route: ${seed.expectedMetrics.minRouteLen}</span>
                <span>Complexity: ${seed.expectedMetrics.complexity}</span>
            </div>
        `;

        card.addEventListener('click', () => this.selectSeed(seed));
        return card;
    }

    async selectSeed(seed) {
        try {
            this.elements.statusDiv.textContent = `Loading seed: ${seed.name}...`;

            const response = await fetch(`../../seeds/${seed.path}`);
            if (!response.ok) {
                throw new Error(`Failed to load seed: ${response.status}`);
            }

            this.currentSeed = seed;
            this.currentOperon = await response.json();
            this.showSeedDetail();
            this.elements.statusDiv.textContent = `Viewing: ${seed.name}`;
        } catch (error) {
            console.error('Error loading seed:', error);
            this.elements.statusDiv.textContent = `Error loading seed: ${error.message}`;
        }
    }

    showSeedDetail() {
        this.elements.seedsList.style.display = 'none';
        this.elements.seedDetail.style.display = 'block';

        this.elements.seedTitle.textContent = this.currentSeed.name;
        this.renderSeedMetadata();
        this.renderDAG();
        this.renderRawData();
    }

    showSeedsList() {
        this.elements.seedDetail.style.display = 'none';
        this.elements.seedsList.style.display = 'block';
        this.currentSeed = null;
        this.currentOperon = null;
    }

    renderSeedMetadata() {
        const metadata = `
            <div class="metadata-grid">
                <div><strong>Name:</strong> ${this.currentSeed.name}</div>
                <div><strong>Category:</strong> ${this.currentSeed.category}</div>
                <div><strong>Description:</strong> ${this.currentSeed.description}</div>
                <div><strong>Node Count:</strong> ${this.currentSeed.expectedMetrics.nodeCount}</div>
                <div><strong>Min Route Length:</strong> ${this.currentSeed.expectedMetrics.minRouteLen}</div>
                <div><strong>Complexity:</strong> ${this.currentSeed.expectedMetrics.complexity}</div>
                <div><strong>Invariants:</strong><ul>${this.currentSeed.invariants.map(inv => `<li>${inv}</li>`).join('')}</ul></div>
            </div>
        `;
        this.elements.seedMetadata.innerHTML = metadata;
    }

    renderDAG() {
        const svg = this.elements.dagSvg;
        svg.innerHTML = ''; // Clear previous content

        if (!this.currentOperon || !this.currentOperon.nodes) {
            svg.innerHTML = '<text x="50" y="50" fill="#666">No DAG data available</text>';
            return;
        }

        const nodes = this.currentOperon.nodes;
        const nodeIds = Object.keys(nodes).filter(id => nodes[id].op); // Filter out root nodes

        if (nodeIds.length === 0) {
            svg.innerHTML = '<text x="50" y="50" fill="#666">No operation nodes found</text>';
            return;
        }

        // Simple horizontal layout
        const nodeWidth = 120;
        const nodeHeight = 80;
        const spacing = 150;
        const startX = 50;
        const startY = 150;

        const nodePositions = {};

        // Position nodes horizontally
        nodeIds.forEach((nodeId, index) => {
            nodePositions[nodeId] = {
                x: startX + (index * spacing),
                y: startY
            };
        });

        // Draw connections first (under nodes)
        nodeIds.forEach(nodeId => {
            const node = nodes[nodeId];
            if (node.links && node.links.out) {
                const targetId = node.links.out;
                if (nodePositions[targetId]) {
                    const fromPos = nodePositions[nodeId];
                    const toPos = nodePositions[targetId];

                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', fromPos.x + nodeWidth/2);
                    line.setAttribute('y1', fromPos.y + nodeHeight);
                    line.setAttribute('x2', toPos.x + nodeWidth/2);
                    line.setAttribute('y2', toPos.y);
                    line.setAttribute('stroke', '#4CAF50');
                    line.setAttribute('stroke-width', '2');
                    line.setAttribute('marker-end', 'url(#arrowhead)');
                    svg.appendChild(line);
                }
            }
        });

        // Add arrowhead marker
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#4CAF50');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);

        // Draw nodes
        nodeIds.forEach(nodeId => {
            const node = nodes[nodeId];
            const pos = nodePositions[nodeId];

            // Node rectangle
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', pos.x);
            rect.setAttribute('y', pos.y);
            rect.setAttribute('width', nodeWidth);
            rect.setAttribute('height', nodeHeight);
            rect.setAttribute('fill', '#f8f9fa');
            rect.setAttribute('stroke', '#dee2e6');
            rect.setAttribute('stroke-width', '2');
            rect.setAttribute('rx', '5');
            svg.appendChild(rect);

            // Operation label
            const opText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            opText.setAttribute('x', pos.x + nodeWidth/2);
            opText.setAttribute('y', pos.y + 20);
            opText.setAttribute('text-anchor', 'middle');
            opText.setAttribute('font-weight', 'bold');
            opText.setAttribute('font-size', '14');
            opText.setAttribute('fill', '#333');
            opText.textContent = node.op;
            svg.appendChild(opText);

            // GID (truncated)
            const gidText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            gidText.setAttribute('x', pos.x + nodeWidth/2);
            gidText.setAttribute('y', pos.y + 35);
            gidText.setAttribute('text-anchor', 'middle');
            gidText.setAttribute('font-size', '10');
            gidText.setAttribute('fill', '#666');
            gidText.textContent = `gid[..8]: ${node.gid.substring(0, 8)}`;
            svg.appendChild(gidText);

            // IID (truncated)
            const iidText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            iidText.setAttribute('x', pos.x + nodeWidth/2);
            iidText.setAttribute('y', pos.y + 50);
            iidText.setAttribute('text-anchor', 'middle');
            iidText.setAttribute('font-size', '10');
            iidText.setAttribute('fill', '#666');
            iidText.textContent = `iid[..8]: ${node.iid.substring(0, 8)}`;
            svg.appendChild(iidText);

            // Cost
            const costText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            costText.setAttribute('x', pos.x + nodeWidth/2);
            costText.setAttribute('y', pos.y + 65);
            costText.setAttribute('text-anchor', 'middle');
            costText.setAttribute('font-size', '9');
            costText.setAttribute('fill', '#888');
            costText.textContent = node.cost || 'O(?)';
            svg.appendChild(costText);
        });

        // Auto-adjust SVG viewBox based on content
        const maxX = Math.max(...Object.values(nodePositions).map(pos => pos.x)) + nodeWidth + 50;
        svg.setAttribute('viewBox', `0 0 ${maxX} 400`);
    }

    renderRawData() {
        this.elements.seedRawData.textContent = JSON.stringify(this.currentOperon, null, 2);
    }

    filterSeeds(searchTerm) {
        if (!this.seedsIndex) return;

        const filteredSeeds = this.seedsIndex.seeds.filter(seed =>
            seed.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            seed.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            seed.category.toLowerCase().includes(searchTerm.toLowerCase())
        );

        this.elements.seedsList.innerHTML = '';
        filteredSeeds.forEach(seed => {
            const seedCard = this.createSeedCard(seed);
            this.elements.seedsList.appendChild(seedCard);
        });

        this.elements.statusDiv.textContent = searchTerm ?
            `Found ${filteredSeeds.length} seeds matching "${searchTerm}"` :
            `Showing all ${this.seedsIndex.seeds.length} seeds`;
    }

    openInMirrorBench() {
        if (!this.currentSeed) return;

        const mirrorBenchUrl = `../../mirrorbench/index.html#seed=${encodeURIComponent(this.currentSeed.name)}`;
        window.open(mirrorBenchUrl, '_blank');
    }

    exportCurrentSeed() {
        if (!this.currentOperon || !this.currentSeed) return;

        const dataStr = JSON.stringify(this.currentOperon, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${this.currentSeed.name}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.elements.statusDiv.textContent = `Exported ${this.currentSeed.name}.json`;
    }

    compareWithCurrent() {
        if (!this.operonData || !this.currentOperon) {
            alert('Current operon data not available for comparison');
            return;
        }

        // Find IIDs that match between current seed and operon
        const seedIIDs = new Set(this.currentOperon.iidSet || []);
        const operonIIDs = new Set();

        // Extract IIDs from operon data
        if (this.operonData.nodes) {
            Object.values(this.operonData.nodes).forEach(node => {
                if (node.iid) operonIIDs.add(node.iid);
            });
        }

        const matchingIIDs = [...seedIIDs].filter(iid => operonIIDs.has(iid));

        // Re-render DAG with matching IIDs highlighted
        this.renderDAGWithHighlights(matchingIIDs);

        this.elements.statusDiv.textContent = `Comparison: ${matchingIIDs.length} matching IIDs found`;
    }

    renderDAGWithHighlights(highlightIIDs) {
        // Same as renderDAG but with highlighting for matching IIDs
        const svg = this.elements.dagSvg;
        svg.innerHTML = '';

        if (!this.currentOperon || !this.currentOperon.nodes) {
            svg.innerHTML = '<text x="50" y="50" fill="#666">No DAG data available</text>';
            return;
        }

        const nodes = this.currentOperon.nodes;
        const nodeIds = Object.keys(nodes).filter(id => nodes[id].op);

        if (nodeIds.length === 0) {
            svg.innerHTML = '<text x="50" y="50" fill="#666">No operation nodes found</text>';
            return;
        }

        const nodeWidth = 120;
        const nodeHeight = 80;
        const spacing = 150;
        const startX = 50;
        const startY = 150;

        const nodePositions = {};

        nodeIds.forEach((nodeId, index) => {
            nodePositions[nodeId] = {
                x: startX + (index * spacing),
                y: startY
            };
        });

        // Draw connections
        nodeIds.forEach(nodeId => {
            const node = nodes[nodeId];
            if (node.links && node.links.out) {
                const targetId = node.links.out;
                if (nodePositions[targetId]) {
                    const fromPos = nodePositions[nodeId];
                    const toPos = nodePositions[targetId];

                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', fromPos.x + nodeWidth/2);
                    line.setAttribute('y1', fromPos.y + nodeHeight);
                    line.setAttribute('x2', toPos.x + nodeWidth/2);
                    line.setAttribute('y2', toPos.y);
                    line.setAttribute('stroke', '#4CAF50');
                    line.setAttribute('stroke-width', '2');
                    line.setAttribute('marker-end', 'url(#arrowhead)');
                    svg.appendChild(line);
                }
            }
        });

        // Add arrowhead marker
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#4CAF50');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);

        // Draw nodes with highlighting
        nodeIds.forEach(nodeId => {
            const node = nodes[nodeId];
            const pos = nodePositions[nodeId];
            const isHighlighted = highlightIIDs.includes(node.iid);

            // Node rectangle with conditional highlighting
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', pos.x);
            rect.setAttribute('y', pos.y);
            rect.setAttribute('width', nodeWidth);
            rect.setAttribute('height', nodeHeight);
            rect.setAttribute('fill', isHighlighted ? '#fff3cd' : '#f8f9fa');
            rect.setAttribute('stroke', isHighlighted ? '#ff6b6b' : '#dee2e6');
            rect.setAttribute('stroke-width', isHighlighted ? '3' : '2');
            rect.setAttribute('rx', '5');
            svg.appendChild(rect);

            // Add highlight indicator
            if (isHighlighted) {
                const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                highlight.setAttribute('cx', pos.x + nodeWidth - 10);
                highlight.setAttribute('cy', pos.y + 10);
                highlight.setAttribute('r', '5');
                highlight.setAttribute('fill', '#ff6b6b');
                svg.appendChild(highlight);
            }

            // Operation label
            const opText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            opText.setAttribute('x', pos.x + nodeWidth/2);
            opText.setAttribute('y', pos.y + 20);
            opText.setAttribute('text-anchor', 'middle');
            opText.setAttribute('font-weight', 'bold');
            opText.setAttribute('font-size', '14');
            opText.setAttribute('fill', '#333');
            opText.textContent = node.op;
            svg.appendChild(opText);

            // GID (truncated)
            const gidText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            gidText.setAttribute('x', pos.x + nodeWidth/2);
            gidText.setAttribute('y', pos.y + 35);
            gidText.setAttribute('text-anchor', 'middle');
            gidText.setAttribute('font-size', '10');
            gidText.setAttribute('fill', '#666');
            gidText.textContent = `gid[..8]: ${node.gid.substring(0, 8)}`;
            svg.appendChild(gidText);

            // IID (truncated) with highlighting
            const iidText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            iidText.setAttribute('x', pos.x + nodeWidth/2);
            iidText.setAttribute('y', pos.y + 50);
            iidText.setAttribute('text-anchor', 'middle');
            iidText.setAttribute('font-size', '10');
            iidText.setAttribute('fill', isHighlighted ? '#d63384' : '#666');
            iidText.setAttribute('font-weight', isHighlighted ? 'bold' : 'normal');
            iidText.textContent = `iid[..8]: ${node.iid.substring(0, 8)}`;
            svg.appendChild(iidText);

            // Cost
            const costText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            costText.setAttribute('x', pos.x + nodeWidth/2);
            costText.setAttribute('y', pos.y + 65);
            costText.setAttribute('text-anchor', 'middle');
            costText.setAttribute('font-size', '9');
            costText.setAttribute('fill', '#888');
            costText.textContent = node.cost || 'O(?)';
            svg.appendChild(costText);
        });

        // Auto-adjust SVG viewBox
        const maxX = Math.max(...Object.values(nodePositions).map(pos => pos.x)) + nodeWidth + 50;
        svg.setAttribute('viewBox', `0 0 ${maxX} 400`);
    }
}

// Initialize the gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SeedGallery();
});