#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const DIGEST_PATH = 'docs/status/daily.md';

async function generateDigest() {
  try {
    // Read trust metrics
    let trust = 'н/д', dsse = 'н/д';
    try {
      const trustData = JSON.parse(fs.readFileSync('dist/trust.json', 'utf8'));
      trust = (trustData.score * 100).toFixed(1) + '%';
      dsse = (trustData.components.dsse * 100).toFixed(0) + '%';
    } catch (e) {
      console.warn('⚠️ Trust metrics not available');
    }

    // Read novelty from trust.json or fallback to metrics.json
    let novelty = 'н/д';
    try {
      const trustData = JSON.parse(fs.readFileSync('dist/trust.json', 'utf8'));
      if (trustData.novelty?.median !== undefined) {
        novelty = trustData.novelty.median.toFixed(2);
      }
    } catch (e) {
      // Fallback to metrics.json
      try {
        const metricsData = JSON.parse(fs.readFileSync('dist/metrics.json', 'utf8'));
        novelty = (metricsData.novelty?.median || 0.35).toFixed(2);
      } catch (e2) {
        console.warn('⚠️ Novelty metrics not available');
      }
    }

    // Count seeds
    let seedCount = 0;
    try {
      const seedFiles = fs.readdirSync('out/sweep-final/')
        .filter(f => f.endsWith('.json'));
      seedCount = seedFiles.length;
    } catch (e) {
      console.warn('⚠️ Seed count not available');
    }

    // Check quarantine
    let risks = 0;
    try {
      const quarantineData = JSON.parse(fs.readFileSync('observability/quarantine.json', 'utf8'));
      risks = quarantineData.frozen?.length || 0;
    } catch (e) {
      console.warn('⚠️ Quarantine status not available');
    }

    // Count pattern distribution
    let patterns = {};
    try {
      const seedFiles = fs.readdirSync('out/sweep-final/')
        .filter(f => f.endsWith('.json'));

      for (const file of seedFiles) {
        try {
          const seed = JSON.parse(fs.readFileSync(path.join('out/sweep-final/', file), 'utf8'));
          const patternName = seed.name?.split('-')[0] || 'unknown';
          patterns[patternName] = (patterns[patternName] || 0) + 1;
        } catch (e) {
          // Skip invalid seed files
        }
      }
    } catch (e) {
      console.warn('⚠️ Pattern distribution not available');
    }

    // Try to read scoreboard data first, fallback to pattern counting
    let topPatterns = 'н/д';
    let scoreboardSeeds = null;

    try {
      // Try docs/scoreboard/index.json first
      let scoreboardData;
      try {
        scoreboardData = JSON.parse(fs.readFileSync('docs/scoreboard/index.json', 'utf8'));
      } catch (e) {
        // Fallback to dist/scoreboard.json
        scoreboardData = JSON.parse(fs.readFileSync('dist/scoreboard.json', 'utf8'));
      }

      if (scoreboardData.topPatterns) {
        topPatterns = scoreboardData.topPatterns
          .slice(0, 5)
          .map(p => `${p.name}(${p.count})`)
          .join(', ');
      }

      if (scoreboardData.seedsToday !== undefined) {
        scoreboardSeeds = scoreboardData.seedsToday;
      }
    } catch (e) {
      // Fallback to manual pattern counting
      const patternEntries = Object.entries(patterns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      if (patternEntries.length > 0) {
        topPatterns = patternEntries
          .map(([name, count]) => `${name}(${count})`)
          .join(', ');
      }
    }

    // Use scoreboard seeds if available, otherwise use counted seeds
    const finalSeedCount = scoreboardSeeds !== null ? scoreboardSeeds : seedCount;

    // Generate digest
    const date = new Date().toISOString().split('T')[0];
    const digest = `# 📈 Daily Digest ${date}

**Метрики:**
- Trust: ${trust} | DSSE: ${dsse} | Novelty: ${novelty}
- Seeds: ${finalSeedCount} | Risks: ${risks}

**Top patterns:** ${topPatterns}

**Статус:** ${risks > 0 ? '🔴 QUARANTINE' : (trust.includes('н/д') || dsse.includes('н/д')) ? '🟡 PARTIAL' : '🟢 HEALTHY'}

---
*Автогенерація: ${new Date().toISOString()}*
`;

    // Ensure directory exists
    fs.mkdirSync('docs/status', { recursive: true });

    // Write digest
    fs.writeFileSync(DIGEST_PATH, digest);

    console.log('✅ Daily digest generated:', DIGEST_PATH);
    console.log(`📊 Trust: ${trust}, DSSE: ${dsse}, Novelty: ${novelty}`);
    console.log(`🌱 Seeds: ${finalSeedCount}, Risks: ${risks}`);

  } catch (error) {
    console.error('❌ Failed to generate digest:', error.message);
    process.exit(1);
  }
}

generateDigest();