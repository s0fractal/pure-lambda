#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { similarity } from './similarity.mjs';

const THRESHOLD = parseFloat(process.env.NOVELTY_SIM_THRESH || '0.85'); // 0.85 = дуже схоже

function loadSeed(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (error) {
    console.warn(`⚠️ Could not load seed: ${p} - ${error.message}`);
    return null;
  }
}

export function findNearDuplicates(targetPath, corpusPaths) {
  const target = loadSeed(targetPath);
  if (!target) {
    throw new Error(`Cannot load target seed: ${targetPath}`);
  }

  const hits = [];
  for (const p of corpusPaths) {
    if (p === targetPath) continue;

    const seed = loadSeed(p);
    if (!seed) continue;

    try {
      const sim = similarity(target, seed);
      if (sim >= THRESHOLD) {
        hits.push({
          path: p,
          sim: +sim.toFixed(3),
          name: seed.name || path.basename(p, '.json')
        });
      }
    } catch (error) {
      console.warn(`⚠️ Similarity calculation failed for ${p}: ${error.message}`);
    }
  }

  hits.sort((a, b) => b.sim - a.sim);
  return hits;
}

export function checkCorpusForDuplicates(corpusPaths, threshold = THRESHOLD) {
  console.log(`🔍 Scanning ${corpusPaths.length} seeds for near-duplicates (threshold: ${threshold})`);

  const allPairs = [];
  for (let i = 0; i < corpusPaths.length; i++) {
    for (let j = i + 1; j < corpusPaths.length; j++) {
      const seedA = loadSeed(corpusPaths[i]);
      const seedB = loadSeed(corpusPaths[j]);

      if (!seedA || !seedB) continue;

      try {
        const sim = similarity(seedA, seedB);
        if (sim >= threshold) {
          allPairs.push({
            pathA: corpusPaths[i],
            pathB: corpusPaths[j],
            sim: +sim.toFixed(3),
            nameA: seedA.name || path.basename(corpusPaths[i], '.json'),
            nameB: seedB.name || path.basename(corpusPaths[j], '.json')
          });
        }
      } catch (error) {
        console.warn(`⚠️ Similarity check failed: ${corpusPaths[i]} vs ${corpusPaths[j]}`);
      }
    }
  }

  return allPairs.sort((a, b) => b.sim - a.sim);
}

// CLI
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(`Usage:
  node dedupe.mjs <target.json> <corpus1.json> [corpus2.json] ...
  node dedupe.mjs --scan <corpus1.json> [corpus2.json] ...

Environment:
  NOVELTY_SIM_THRESH=0.85 (similarity threshold, default 0.85)`);
    process.exit(1);
  }

  if (args[0] === '--scan') {
    // Scan all pairs in corpus
    const corpus = args.slice(1);
    const duplicates = checkCorpusForDuplicates(corpus);

    console.log(JSON.stringify({
      duplicatePairs: duplicates,
      threshold: THRESHOLD,
      corpusSize: corpus.length
    }, null, 2));

    process.exit(duplicates.length > 0 ? 2 : 0);
  } else {
    // Find near-duplicates for specific target
    const [target, ...corpus] = args;
    const result = findNearDuplicates(target, corpus);

    console.log(JSON.stringify({
      target,
      nearDuplicates: result,
      threshold: THRESHOLD
    }, null, 2));

    process.exit(result.length > 0 ? 2 : 0);
  }
}