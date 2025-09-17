#!/usr/bin/env node

/**
 * Gene Registry Score Updater
 * Calculates reputation scores based on transparent formula
 */

const fs = require('fs');
const path = require('path');
const toml = require('@iarna/toml');

// Load scoring configuration
const scoreConfig = toml.parse(
  fs.readFileSync(path.join(__dirname, 'score.toml'), 'utf8')
);

// Load all genes
const genesDir = path.join(__dirname, 'genes');
const genes = fs.readdirSync(genesDir)
  .filter(f => f.endsWith('.json'))
  .map(f => {
    const content = fs.readFileSync(path.join(genesDir, f), 'utf8');
    return { file: f, data: JSON.parse(content) };
  });

/**
 * Calculate normalized metric value
 */
function normalize(value, max) {
  return Math.min(1.0, value / max);
}

/**
 * Calculate gene score based on weighted formula
 */
function calculateScore(gene) {
  const weights = scoreConfig.weights;
  const norm = scoreConfig.normalization;
  const metrics = gene.metrics || {};
  
  let score = 0;
  
  // Performance metrics
  if (metrics.speedup) {
    score += weights.speedup * normalize(metrics.speedup, norm.max_speedup);
  }
  
  if (metrics.allocs !== undefined) {
    const efficiency = 1 - (metrics.allocs / norm.max_allocs);
    score += weights.efficiency * Math.max(0, efficiency);
  }
  
  // Quality metrics
  if (metrics.proof_coverage !== undefined) {
    score += weights.proof_coverage * metrics.proof_coverage;
  }
  
  // Determinism (placeholder - would need actual measurement)
  score += weights.determinism * 0.8; // Default high determinism
  
  // Adoption metrics
  const usage = gene.dependencies ? gene.dependencies.length : 0;
  score += weights.usage * normalize(usage, norm.max_usage);
  
  const votes = gene.reputation?.votes || 0;
  score += weights.votes * normalize(votes, norm.max_votes);
  
  // Apply penalties
  const penalties = scoreConfig.penalties;
  if (!gene.provenance || gene.provenance.length === 0) {
    score += penalties.no_provenance;
  }
  if (!gene.signatures || gene.signatures.length === 0) {
    score += penalties.no_signature;
  }
  
  // Apply bonuses
  const bonuses = scoreConfig.bonuses;
  if (metrics.proof_coverage === 1.0) {
    score += bonuses.all_laws_proven;
  }
  if (metrics.allocs === 0) {
    score += bonuses.zero_allocs;
  }
  
  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}

/**
 * Determine gene status based on score
 */
function getStatus(score) {
  const thresholds = scoreConfig.thresholds;
  if (score >= thresholds.champion) return 'champion';
  if (score >= thresholds.candidate) return 'candidate';
  if (score < thresholds.deprecated) return 'deprecated';
  return 'standard';
}

// Calculate scores for all genes
const scored = genes.map(({ file, data }) => {
  const score = calculateScore(data);
  return {
    file,
    name: data.name,
    score,
    status: getStatus(score),
    data
  };
});

// Sort by score
scored.sort((a, b) => b.score - a.score);

// Assign ranks
scored.forEach((gene, index) => {
  gene.rank = index + 1;
});

// Update gene files with new scores and ranks
scored.forEach(({ file, data, score, rank }) => {
  data.reputation = data.reputation || {};
  data.reputation.score = parseFloat(score.toFixed(3));
  data.reputation.rank = rank;
  
  const filePath = path.join(genesDir, file);
  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2) + '\n'
  );
});

// Generate leaderboard
const leaderboard = {
  updated: new Date().toISOString(),
  formula: scoreConfig.formula.description,
  genes: scored.map(g => ({
    name: g.name,
    score: parseFloat(g.score.toFixed(3)),
    rank: g.rank,
    status: g.status,
    cid: g.data.cid,
    soul: g.data.soul
  }))
};

fs.writeFileSync(
  path.join(__dirname, 'leaderboard.json'),
  JSON.stringify(leaderboard, null, 2) + '\n'
);

// Print results
console.log('🧬 Gene Registry Updated');
console.log('========================');
console.log();
console.log('Top Genes:');
scored.slice(0, 5).forEach(g => {
  const emoji = g.status === 'champion' ? '👑' : 
                g.status === 'candidate' ? '🌟' : '📦';
  console.log(`${emoji} #${g.rank} ${g.name}: ${g.score.toFixed(3)}`);
});
console.log();
console.log(`Total genes: ${scored.length}`);
console.log(`Champions: ${scored.filter(g => g.status === 'champion').length}`);
console.log(`Candidates: ${scored.filter(g => g.status === 'candidate').length}`);
console.log(`Deprecated: ${scored.filter(g => g.status === 'deprecated').length}`);