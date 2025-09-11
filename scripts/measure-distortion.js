#!/usr/bin/env node
// Measure address→value distortion in the codebase

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Compute soul (semantic hash) of code
function computeSoul(content) {
    const normalized = content
        .replace(/\/\/.*$/gm, '')  // Remove comments
        .replace(/\s+/g, ' ')       // Normalize whitespace
        .trim();
    
    const hash = crypto.createHash('blake2b512');
    hash.update(normalized);
    return hash.digest('hex').slice(0, 16);
}

// Analyze a directory for address→value mappings
function analyzeDirectory(dir) {
    const ledger = [];
    const souls = new Map();  // soul → [addresses]
    
    function walk(currentDir) {
        const files = fs.readdirSync(currentDir);
        
        for (const file of files) {
            const fullPath = path.join(currentDir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'target') {
                walk(fullPath);
            } else if (stat.isFile() && (file.endsWith('.rs') || file.endsWith('.js') || file.endsWith('.ts'))) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const soul = computeSoul(content);
                const address = path.relative(dir, fullPath);
                
                ledger.push({ address, soul, size: content.length });
                
                if (!souls.has(soul)) {
                    souls.set(soul, []);
                }
                souls.get(soul).push(address);
            }
        }
    }
    
    walk(dir);
    return { ledger, souls };
}

// Compute distortion metrics
function computeDistortion(ledger, souls) {
    const total = ledger.length;
    if (total === 0) return null;
    
    // δ₁: Unpredictability - address doesn't hint at content
    let unpredictable = 0;
    for (const entry of ledger) {
        const nameParts = path.basename(entry.address, path.extname(entry.address)).toLowerCase();
        const soulPrefix = entry.soul.slice(0, 4);
        if (!nameParts.includes('test') && !nameParts.includes('spec')) {
            // Simple heuristic: good names are descriptive
            if (nameParts.length < 3) unpredictable++;
        }
    }
    
    // δ₂: Instability - (would need git history to measure properly)
    const instability = 0;  // Placeholder
    
    // δ₃: Nonlocality - deep nesting
    let totalDepth = 0;
    for (const entry of ledger) {
        const depth = entry.address.split('/').length - 1;
        totalDepth += depth;
    }
    const avgDepth = totalDepth / total;
    const nonlocality = avgDepth / 10;  // Normalize to 0-1
    
    // δ₄: Redundancy - multiple files with same soul
    let redundantFiles = 0;
    for (const [soul, addresses] of souls) {
        if (addresses.length > 1) {
            redundantFiles += addresses.length - 1;
        }
    }
    
    return {
        unpredictability: unpredictable / total,
        instability,
        nonlocality: Math.min(1, nonlocality),
        redundancy: redundantFiles / total,
        
        // Summary stats
        totalFiles: total,
        uniqueSouls: souls.size,
        redundantGroups: Array.from(souls.values()).filter(a => a.length > 1).length
    };
}

// Generate markdown report
function generateReport(distortion, souls) {
    const weights = {
        unpredictability: 0.4,
        instability: 0.2,
        nonlocality: 0.3,
        redundancy: 0.1
    };
    
    const total = 
        weights.unpredictability * distortion.unpredictability +
        weights.instability * distortion.instability +
        weights.nonlocality * distortion.nonlocality +
        weights.redundancy * distortion.redundancy;
    
    let report = `# Address→Value Distortion Report\n\n`;
    report += `Date: ${new Date().toISOString()}\n\n`;
    
    report += `## Summary\n\n`;
    report += `**Total Distortion: ${(total * 100).toFixed(1)}%**\n\n`;
    
    report += `## Metrics\n\n`;
    report += `| Metric | Value | Weight | Contribution |\n`;
    report += `|--------|-------|--------|-------------|\n`;
    report += `| Unpredictability | ${(distortion.unpredictability * 100).toFixed(1)}% | ${weights.unpredictability} | ${(weights.unpredictability * distortion.unpredictability * 100).toFixed(1)}% |\n`;
    report += `| Instability | ${(distortion.instability * 100).toFixed(1)}% | ${weights.instability} | ${(weights.instability * distortion.instability * 100).toFixed(1)}% |\n`;
    report += `| Nonlocality | ${(distortion.nonlocality * 100).toFixed(1)}% | ${weights.nonlocality} | ${(weights.nonlocality * distortion.nonlocality * 100).toFixed(1)}% |\n`;
    report += `| Redundancy | ${(distortion.redundancy * 100).toFixed(1)}% | ${weights.redundancy} | ${(weights.redundancy * distortion.redundancy * 100).toFixed(1)}% |\n`;
    
    report += `\n## Statistics\n\n`;
    report += `- Total files: ${distortion.totalFiles}\n`;
    report += `- Unique souls: ${distortion.uniqueSouls}\n`;
    report += `- Redundant groups: ${distortion.redundantGroups}\n`;
    
    // Show redundant files
    if (distortion.redundantGroups > 0) {
        report += `\n## Redundant Files (same soul)\n\n`;
        let count = 0;
        for (const [soul, addresses] of souls) {
            if (addresses.length > 1 && count < 5) {
                report += `\n### Soul: \`${soul}\`\n`;
                for (const addr of addresses) {
                    report += `- ${addr}\n`;
                }
                count++;
            }
        }
    }
    
    report += `\n## Recommendations\n\n`;
    if (distortion.redundancy > 0.1) {
        report += `- **High redundancy**: Consider merging duplicate code or extracting common patterns\n`;
    }
    if (distortion.nonlocality > 0.5) {
        report += `- **Deep nesting**: Consider flattening directory structure\n`;
    }
    if (distortion.unpredictability > 0.3) {
        report += `- **Poor naming**: Improve file names to reflect content\n`;
    }
    
    report += `\n---\n*Generated by distortion-meter*\n`;
    
    return report;
}

// Main
function main() {
    const targetDir = process.argv[2] || '.';
    
    console.log(`Analyzing ${targetDir}...`);
    const { ledger, souls } = analyzeDirectory(targetDir);
    
    const distortion = computeDistortion(ledger, souls);
    if (!distortion) {
        console.log('No files found');
        return;
    }
    
    const report = generateReport(distortion, souls);
    
    // Save report
    const reportPath = 'distortion-report.md';
    fs.writeFileSync(reportPath, report);
    
    // Update STATE.md if exists
    if (fs.existsSync('STATE.md')) {
        let state = fs.readFileSync('STATE.md', 'utf8');
        
        // Add distortion section
        const distortionSection = `
## Address→Value Distortion

| Component | Value |
|-----------|-------|
| Unpredictability | ${(distortion.unpredictability * 100).toFixed(1)}% |
| Instability | ${(distortion.instability * 100).toFixed(1)}% |
| Nonlocality | ${(distortion.nonlocality * 100).toFixed(1)}% |
| Redundancy | ${(distortion.redundancy * 100).toFixed(1)}% |
| **Total** | **${((0.4 * distortion.unpredictability + 0.2 * distortion.instability + 0.3 * distortion.nonlocality + 0.1 * distortion.redundancy) * 100).toFixed(1)}%** |
`;
        
        // Insert before "Open Threads" or at end
        const insertPoint = state.indexOf('## Open Threads');
        if (insertPoint > 0) {
            state = state.slice(0, insertPoint) + distortionSection + '\n' + state.slice(insertPoint);
        } else {
            state += distortionSection;
        }
        
        fs.writeFileSync('STATE.md', state);
        console.log('✅ Updated STATE.md with distortion metrics');
    }
    
    console.log(`✅ Report saved to ${reportPath}`);
    console.log(`Total distortion: ${((0.4 * distortion.unpredictability + 0.2 * distortion.instability + 0.3 * distortion.nonlocality + 0.1 * distortion.redundancy) * 100).toFixed(1)}%`);
}

main();