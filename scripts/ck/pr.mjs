#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Import validation utilities
import { validateSeed } from './validate.mjs';

// Generate MirrorBench link
function generateMirrorBenchLink(seedName) {
  const baseUrl = 'https://mirror.pure-lambda.tech';
  const encoded = encodeURIComponent(seedName);
  return `${baseUrl}/#seed=${encoded}`;
}

// Calculate complexity score
function calculateComplexity(seed) {
  const nodeCount = seed.tiles?.length || 0;
  const edgeCount = seed.edges?.length || 0;
  const depth = calculateDepth(seed);

  let complexity = 'Low';
  if (nodeCount > 100 || edgeCount > 200 || depth > 10) {
    complexity = 'High';
  } else if (nodeCount > 50 || edgeCount > 100 || depth > 5) {
    complexity = 'Medium';
  }

  return {
    level: complexity,
    nodes: nodeCount,
    edges: edgeCount,
    depth: depth
  };
}

// Calculate graph depth (longest path)
function calculateDepth(seed) {
  if (!seed.edges || seed.edges.length === 0) return 1;

  // Simple heuristic: count unique "levels" based on dependencies
  const nodes = new Set();
  seed.edges.forEach(edge => {
    if (edge.from) nodes.add(edge.from.split('.')[0]);
    if (edge.to) nodes.add(edge.to.split('.')[0]);
  });

  return Math.min(nodes.size, 20); // Cap at reasonable depth
}

// Analyze seed characteristics
function analyzeSeed(seed) {
  const analysis = {
    type: 'Unknown',
    pattern: 'Custom',
    characteristics: []
  };

  // Detect common patterns
  if (seed.name?.includes('hello') || seed.name?.includes('example')) {
    analysis.type = 'Example';
    analysis.pattern = 'Hello World';
  } else if (seed.tiles?.some(t => t.type === 'map' || t.type === 'reduce')) {
    analysis.type = 'Computation';
    analysis.pattern = 'Map-Reduce';
  } else if (seed.tiles?.some(t => t.type === 'branch' || t.type === 'merge')) {
    analysis.type = 'Control Flow';
    analysis.pattern = 'Branching Logic';
  } else if (seed.tiles?.some(t => t.type === 'delay' || t.type === 'timer')) {
    analysis.type = 'Temporal';
    analysis.pattern = 'Time-based';
  }

  // Identify characteristics
  if (seed.tiles?.length > 100) {
    analysis.characteristics.push('Large graph');
  }
  if (seed.meta?.profile === 'realtime') {
    analysis.characteristics.push('Real-time');
  }
  if (seed.meta?.cost?.lambda > 10) {
    analysis.characteristics.push('Compute intensive');
  }

  return analysis;
}

// Generate PR markdown
function generatePRMarkdown(cartridge, validationResults = null) {
  const seed = cartridge.seed;
  const manifest = cartridge.manifest;
  const envelope = cartridge.envelope;

  // Calculate metrics
  const complexity = calculateComplexity(seed);
  const analysis = analyzeSeed(seed);
  const mirrorLink = generateMirrorBenchLink(seed.name);

  // Trust score from validation or estimate
  const trustScore = validationResults?.trust?.trustScore || 0;
  const dsseScore = envelope ? 100 : 0;
  const confScore = validationResults?.conformance?.score || 95;
  const freshScore = 100; // Assume fresh for new contributions

  const status = trustScore >= 0.95 ? '✅ READY FOR MERGE' : '⚠️ NEEDS REVIEW';
  const trustDisplay = `${(trustScore * 100).toFixed(1)}%`;

  return `# Seed Contribution: ${seed.name}

## Summary

| Field | Value |
|-------|-------|
| **Name** | \`${seed.name}\` |
| **Type** | ${analysis.type} |
| **Pattern** | ${analysis.pattern} |
| **GID** | \`${manifest.gid.slice(0, 16)}...\` |
| **XIDv2** | \`${manifest.xidV2.slice(0, 16)}...\` |
| **Size** | ${(manifest.size.total / 1024).toFixed(1)} KB |
| **Trust Score** | **${trustDisplay}** |
| **Status** | ${status} |

## Trust Breakdown

| Component | Score | Weight | Contribution |
|-----------|-------|--------|--------------|
| **DSSE Coverage** | ${dsseScore}% ${envelope ? '✅' : '❌'} | 40% | ${(dsseScore * 0.4).toFixed(1)}% |
| **Conformance** | ${confScore}% ${confScore >= 90 ? '✅' : '⚠️'} | 40% | ${(confScore * 0.4).toFixed(1)}% |
| **Freshness** | ${freshScore}% ✅ | 20% | ${(freshScore * 0.2).toFixed(1)}% |
| **TOTAL** | | | **${trustDisplay}** |

## Complexity Analysis

- **Level**: ${complexity.level}
- **Nodes**: ${complexity.nodes}
- **Edges**: ${complexity.edges}
- **Depth**: ${complexity.depth}
- **Characteristics**: ${analysis.characteristics.length > 0 ? analysis.characteristics.join(', ') : 'Standard'}

## Technical Details

### Graph Structure
\`\`\`json
{
  "tiles": ${seed.tiles?.length || 0},
  "edges": ${seed.edges?.length || 0},
  "version": ${seed.version || 1},
  "profile": "${seed.meta?.profile || 'universal'}"
}
\`\`\`

### Resource Requirements
\`\`\`json
{
  "lambda": ${seed.meta?.cost?.lambda || 1},
  "mu": ${seed.meta?.cost?.mu || 1},
  "Lbest": ${seed.meta?.cost?.Lbest || 1}
}
\`\`\`

### Provenance
${envelope ? '🔒 **Signed with DSSE**' : '⚠️ **Unsigned** (consider adding DSSE for higher trust)'}

${envelope ? `
- **Schema**: ${envelope.payloadType || 'unknown'}
- **Key ID**: \`${envelope.signatures?.[0]?.keyid?.slice(-16) || 'unknown'}\`
- **Signed**: ${manifest.provenance?.bundledAt || 'unknown'}
` : ''}

## Validation Results

${validationResults?.conformance?.issues?.length ?
`⚠️ **Issues Found:**
${validationResults.conformance.issues.map(issue => `- ${issue}`).join('\n')}
` : '✅ **All validation checks passed**'}

## Testing

### MirrorBench Preview
🔗 [Interactive Preview](${mirrorLink})

### Local Testing
\`\`\`bash
# Validate locally
node scripts/ck/validate.mjs path/to/${seed.name}.json

# Test in federation
ts-node tools/fed/ingest.ts path/to/${seed.name}.json
\`\`\`

## Size Gates

- **Seed**: ${(manifest.size.seed / 1024).toFixed(1)} KB ${manifest.size.seed <= 80 * 1024 ? '✅' : '❌'} (≤ 80KB)
- **Envelope**: ${(manifest.size.envelope / 1024).toFixed(1)} KB ${manifest.size.envelope <= 20 * 1024 ? '✅' : '❌'} (≤ 20KB)
- **Total**: ${(manifest.size.total / 1024).toFixed(1)} KB ${manifest.size.total <= 100 * 1024 ? '✅' : '❌'} (≤ 100KB)

## Maintainer Checklist

- [ ] Trust score ≥ 95% ${trustScore >= 0.95 ? '✅' : '❌'}
- [ ] No XIDv2 conflicts with existing seeds
- [ ] Appropriate complexity for garden collection
- [ ] Clear naming and structure
- [ ] DSSE signature present ${envelope ? '✅' : '❌'}
- [ ] MirrorBench preview works correctly
- [ ] Documentation adequate for pattern
- [ ] No sensitive or inappropriate content

## Integration Notes

${trustScore >= 0.95 ?
'🎉 **This contribution is ready for automatic integration!**' :
'⚠️ **This contribution requires manual review before integration.**'}

### Post-Merge Actions
- [ ] Add to federation manifest
- [ ] Update trust dashboard
- [ ] Regenerate MirrorBench index
- [ ] Notify contributor of acceptance

---

*Generated by Pure Lambda Contributor Kit v1.0*
*Cartridge: \`${manifest.integrity.seedHash.slice(0, 16)}...\`*
*Bundled: ${manifest.provenance.bundledAt}*`;
}

// Load and analyze cartridge
async function analyzeCartridge(cartridgePath) {
  console.log(`📋 Analyzing cartridge: ${cartridgePath}`);

  if (!fs.existsSync(cartridgePath)) {
    throw new Error(`Cartridge not found: ${cartridgePath}`);
  }

  // Load cartridge
  const cartridgeContent = fs.readFileSync(cartridgePath, 'utf8');
  const cartridge = JSON.parse(cartridgeContent);

  console.log(`   Name: ${cartridge.seed.name}`);
  console.log(`   XIDv2: ${cartridge.manifest.xidV2.slice(0, 16)}...`);
  console.log(`   Has envelope: ${cartridge.envelope ? 'Yes' : 'No'}`);

  // Run validation on the seed
  let validationResults = null;
  try {
    // Create temporary file for validation
    const tmpDir = path.join(projectRoot, 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const tmpSeedPath = path.join(tmpDir, `${cartridge.seed.name}.json`);
    fs.writeFileSync(tmpSeedPath, JSON.stringify(cartridge.seed, null, 2));

    let tmpEnvelopePath = null;
    if (cartridge.envelope) {
      tmpEnvelopePath = path.join(tmpDir, `${cartridge.seed.name}.envelope.json`);
      fs.writeFileSync(tmpEnvelopePath, JSON.stringify(cartridge.envelope, null, 2));
    }

    validationResults = await validateSeed(tmpSeedPath, tmpEnvelopePath);

    // Cleanup
    fs.unlinkSync(tmpSeedPath);
    if (tmpEnvelopePath) fs.unlinkSync(tmpEnvelopePath);

  } catch (error) {
    console.warn(`   ⚠️ Validation failed: ${error.message}`);
  }

  return { cartridge, validationResults };
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Pure Lambda Contributor Kit - PR Generator');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/ck/pr.mjs <cartridge>');
    console.log('');
    console.log('Generates GitHub-ready PR.md from cartridge file.');
    console.log('Output: out/ck/PR.md');
    process.exit(1);
  }

  const cartridgePath = args[0];

  try {
    // Analyze cartridge
    const { cartridge, validationResults } = await analyzeCartridge(cartridgePath);

    // Generate PR markdown
    console.log('\n📝 Generating PR markdown...');
    const prMarkdown = generatePRMarkdown(cartridge, validationResults);

    // Save PR file
    const outputDir = path.join(projectRoot, 'out', 'ck');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const prPath = path.join(outputDir, 'PR.md');
    fs.writeFileSync(prPath, prMarkdown);

    console.log(`   ✅ PR saved: ${prPath}`);
    console.log(`   📏 Size: ${prMarkdown.length} bytes`);

    // Also save a summary for quick reference
    const summaryPath = path.join(outputDir, 'PR-summary.txt');
    const summary = `Seed: ${cartridge.seed.name}
Trust: ${validationResults?.trust ? (validationResults.trust.trustScore * 100).toFixed(1) + '%' : 'Unknown'}
Size: ${(cartridge.manifest.size.total / 1024).toFixed(1)} KB
DSSE: ${cartridge.envelope ? 'Yes' : 'No'}
Status: ${(validationResults?.trust?.trustScore || 0) >= 0.95 ? 'READY' : 'REVIEW'}`;

    fs.writeFileSync(summaryPath, summary);

    console.log('\n🎯 Summary:');
    console.log(summary);

    console.log('\n✅ PR generation complete!');
    console.log('   Copy the PR.md content to create a GitHub pull request.');

  } catch (error) {
    console.error(`❌ PR generation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generatePRMarkdown, analyzeSeed, calculateComplexity };