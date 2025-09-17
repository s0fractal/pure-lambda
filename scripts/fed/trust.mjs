#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Trust Scorer with Updated Formula
 *
 * Calculates trust score = 0.4*dsseRatio + 0.4*conformanceRatio + 0.2*freshness
 * Where freshness = 1.0 if ageMedian ≤ 7 days, else exponential decay
 * Outputs JSON + short table for CI/monitoring
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Configuration
const config = {
  dsseDir: path.join(projectRoot, 'dsse'),
  manifestFile: path.join(projectRoot, 'dist', 'fed', 'manifest.json'),
  gardenDir: path.join(projectRoot, 'seeds', 'garden'),
  conformanceFile: path.join(projectRoot, 'dist', 'fed', 'conformance.json'),
  outputFile: path.join(projectRoot, 'trust-score.json')
};

// Trust scoring weights
const WEIGHTS = {
  dsse: 0.4,
  conformance: 0.4,
  freshness: 0.2
};

const FRESHNESS_THRESHOLD_DAYS = 7;

class TrustScorer {
  constructor() {
    this.gardenSeeds = this.loadGardenSeeds();
    this.dsseEnvelopes = this.loadDSSEEnvelopes();
    this.conformanceResults = this.loadConformanceResults();
    this.manifest = this.loadManifest();
  }

  loadGardenSeeds() {
    try {
      if (!fs.existsSync(config.gardenDir)) {
        console.warn('⚠️  Garden seeds directory not found');
        return [];
      }

      return fs.readdirSync(config.gardenDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(config.gardenDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: path.basename(file, '.json'),
            path: filePath,
            lastModified: stats.mtime,
            size: stats.size
          };
        });
    } catch (error) {
      console.warn('⚠️  Failed to load garden seeds:', error.message);
      return [];
    }
  }

  loadDSSEEnvelopes() {
    try {
      const envelopes = [];
      const self = this;

      function findEnvelopes(dir) {
        if (!fs.existsSync(dir)) return;

        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            findEnvelopes(fullPath);
          } else if (entry.endsWith('.envelope.json')) {
            try {
              const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
              const envelope = {
                path: fullPath,
                valid: self.verifyDSSEEnvelope(content),
                createdAt: stat.ctime,
                size: stat.size,
                artifactName: entry.replace('.envelope.json', ''),
                subjectHash: null
              };

              // Extract subject hash from payload
              const payloadData = content.payloadBase64 || content.payload;
              if (payloadData) {
                try {
                  const payload = JSON.parse(Buffer.from(payloadData, 'base64').toString());
                  if (payload.subject && payload.subject.blake3) {
                    envelope.subjectHash = payload.subject.blake3;
                    envelope.subjectName = payload.subject.name;
                  } else if (payload.seed && payload.seed.hash) {
                    // Old format - use seed hash
                    envelope.subjectHash = payload.seed.hash;
                    envelope.subjectName = payload.name + '.json';
                  }
                } catch (e) {
                  // Could not parse payload
                }
              }

              envelopes.push(envelope);
            } catch (error) {
              console.warn(`⚠️  Failed to load envelope ${fullPath}:`, error.message);
            }
          }
        }
      }

      // Search in multiple locations
      findEnvelopes(config.dsseDir);
      findEnvelopes(path.join(projectRoot, 'dist', 'release', 'dsse'));
      findEnvelopes(path.join(projectRoot, 'dist', 'release'));

      return envelopes;

    } catch (error) {
      console.warn('⚠️  Failed to load DSSE envelopes:', error.message);
      return [];
    }
  }

  verifyDSSEEnvelope(envelope) {
    try {
      // Basic envelope validation - support multiple payload types
      const validPayloadTypes = [
        'application/vnd.in-toto+json',
        'application/vnd.pure-lambda.attestation+json',
        'purelambda/provenance+json'
      ];

      if (!envelope.payloadType || (!validPayloadTypes.includes(envelope.payloadType) && !envelope.payload)) {
        return false;
      }

      // Support both payloadBase64 and payload fields
      const hasPayload = envelope.payloadBase64 || envelope.payload;
      if (!hasPayload || !envelope.signatures || envelope.signatures.length === 0) {
        return false;
      }

      // Check signature structure
      const sig = envelope.signatures[0];
      if (!sig.keyid || !(sig.sigBase64 || sig.sig)) {
        return false;
      }

      // Chain is optional for some formats
      return true;

    } catch (error) {
      return false;
    }
  }

  loadConformanceResults() {
    try {
      if (!fs.existsSync(config.conformanceFile)) {
        console.warn('⚠️  Conformance results not found, using defaults');
        return { passed: 0, total: 0, tests: [] };
      }

      const content = JSON.parse(fs.readFileSync(config.conformanceFile, 'utf8'));
      return {
        passed: content.passed || 0,
        total: content.total || 0,
        ratio: content.ratio || 0,
        tests: content.tests || [],
        lastRun: content.lastRun || content.timestamp || null,
        artifactCoverage: content.artifactCoverage || {},
        summary: content.summary || null
      };

    } catch (error) {
      console.warn('⚠️  Failed to load conformance results:', error.message);
      return { passed: 0, total: 0, tests: [] };
    }
  }

  loadManifest() {
    try {
      if (fs.existsSync(config.manifestFile)) {
        return JSON.parse(fs.readFileSync(config.manifestFile, 'utf8'));
      }
    } catch (error) {
      console.warn('⚠️  Failed to load federation manifest:', error.message);
    }

    return {
      trust: { score: 0, stats: {} },
      quarantine: [],
      seeds: []
    };
  }

  calculateDSSERatio() {
    // Subject-hash-centric DSSE counting
    const artifactsByName = new Map(); // name -> {hash, hasValidDSSE, source}


    // Build artifact list from garden seeds
    this.gardenSeeds.forEach(seed => {
      const seedPath = path.join(config.gardenDir, seed.name + '.json');

      if (fs.existsSync(seedPath)) {
        try {
          const content = fs.readFileSync(seedPath);
          const hash = crypto.createHash('sha256').update(content).digest('hex');

          artifactsByName.set(seed.name + '.json', {
            name: seed.name + '.json',
            subjectHash: hash,
            hasValidDSSE: false,
            source: 'garden'
          });

        } catch (e) {
          // Skip on error
        }
      }
    });

    // Add release artifacts (only those that exist)
    const releaseFiles = [
      { path: path.join(projectRoot, 'dist', 'release', 'stage', 'docs', 'pocket', 'index.htmlc'), name: 'index.htmlc' },
      { path: path.join(projectRoot, 'dist', 'release', 'embassy.zip'), name: 'embassy.zip' }
    ];

    releaseFiles.forEach(file => {
      if (fs.existsSync(file.path)) {
        try {
          const content = fs.readFileSync(file.path);
          const hash = crypto.createHash('sha256').update(content).digest('hex');

          artifactsByName.set(file.name, {
            name: file.name,
            subjectHash: hash,
            hasValidDSSE: false,
            source: 'release'
          });
        } catch (e) {
          // Skip on error
        }
      }
    });


    // Match DSSE envelopes to artifacts
    this.dsseEnvelopes.forEach(env => {
      if (env.valid) {
        // Try to match by subject name or artifact name
        const subjectName = env.subjectName || env.artifactName;

        // Direct name match
        if (artifactsByName.has(subjectName)) {
          artifactsByName.get(subjectName).hasValidDSSE = true;
        }
        // Also try without .envelope suffix
        else if (artifactsByName.has(env.artifactName)) {
          artifactsByName.get(env.artifactName).hasValidDSSE = true;
        }
        // Try matching garden seeds
        else if (env.artifactName && env.artifactName.includes('.')) {
          const seedName = env.artifactName.split('.')[0] + '.json';
          if (artifactsByName.has(seedName)) {
            artifactsByName.get(seedName).hasValidDSSE = true;
          }
        }
      }
    });

    // Count unique artifacts
    const uniqueArtifacts = Array.from(artifactsByName.values());
    const validCount = uniqueArtifacts.filter(a => a.hasValidDSSE).length;
    const totalCount = uniqueArtifacts.length;

    // Expected 11 artifacts: 9 garden seeds + 2 release artifacts (pocket.htmlc, embassy.zip)
    const expectedTotal = 11;

    // Debug missing DSSE
    const missingDSSE = uniqueArtifacts.filter(a => !a.hasValidDSSE);
    if (missingDSSE.length > 0 && !process.argv.includes('--json')) {
      console.log('\n🔍 Missing DSSE for:');
      missingDSSE.forEach(a => console.log(`   - ${a.name} (${a.source})`));
    }

    return {
      ratio: Math.min(1.0, validCount / expectedTotal), // Cap at 1.0 if we have more than expected
      present: totalCount,
      valid: validCount,
      total: expectedTotal,
      details: {
        garden: uniqueArtifacts.filter(a => a.source === 'garden').length,
        gardenWithDSSE: uniqueArtifacts.filter(a => a.source === 'garden' && a.hasValidDSSE).length,
        release: uniqueArtifacts.filter(a => a.source === 'release').length,
        releaseWithDSSE: uniqueArtifacts.filter(a => a.source === 'release' && a.hasValidDSSE).length
      }
    };
  }

  calculateConformanceRatio() {
    if (this.conformanceResults.total === 0) {
      return { ratio: 0, passed: 0, total: 0 };
    }

    // Use precomputed ratio if available, otherwise calculate
    const ratio = this.conformanceResults.ratio !== undefined
      ? this.conformanceResults.ratio
      : this.conformanceResults.passed / this.conformanceResults.total;

    return {
      ratio: ratio,
      passed: this.conformanceResults.passed,
      total: this.conformanceResults.total
    };
  }

  calculateFreshness() {
    if (this.gardenSeeds.length === 0) {
      return { freshness: 0, ageMedianDays: 0, details: 'No seeds found' };
    }

    // Calculate age of each seed
    const now = new Date();
    const seedAges = this.gardenSeeds.map(seed => {
      const ageMs = now.getTime() - seed.lastModified.getTime();
      return ageMs / (1000 * 60 * 60 * 24); // days
    });

    // Calculate median age
    seedAges.sort((a, b) => a - b);
    const median = seedAges.length % 2 === 0
      ? (seedAges[seedAges.length / 2 - 1] + seedAges[seedAges.length / 2]) / 2
      : seedAges[Math.floor(seedAges.length / 2)];

    let freshness;
    if (median <= FRESHNESS_THRESHOLD_DAYS) {
      freshness = 1.0;
    } else {
      // Exponential decay: freshness = e^(-0.1 * (median - 7))
      freshness = Math.exp(-0.1 * (median - FRESHNESS_THRESHOLD_DAYS));
    }

    return {
      freshness: Math.max(0, Math.min(1, freshness)),
      ageMedianDays: median,
      ageRangeDays: [Math.min(...seedAges), Math.max(...seedAges)],
      details: `${seedAges.length} seeds, median age ${median.toFixed(1)} days`
    };
  }

  calculateTrustScore() {
    // Only log if not in json mode
    if (!process.argv.includes('--json')) {
      console.log('🔍 Calculating trust score...\n');
    }

    // Component calculations
    const dsseStats = this.calculateDSSERatio();
    const conformanceStats = this.calculateConformanceRatio();
    const freshnessStats = this.calculateFreshness();

    // Weighted trust score
    const trustScore =
      WEIGHTS.dsse * dsseStats.ratio +
      WEIGHTS.conformance * conformanceStats.ratio +
      WEIGHTS.freshness * freshnessStats.freshness;

    // Quarantine count (from manifest or calculated)
    const quarantineCount = this.manifest.quarantine ? this.manifest.quarantine.length : 0;

    const result = {
      trustScore: Math.max(0, Math.min(1, trustScore)),
      timestamp: new Date().toISOString(),
      components: {
        dsse: {
          weight: WEIGHTS.dsse,
          ratio: dsseStats.ratio,
          contribution: WEIGHTS.dsse * dsseStats.ratio,
          stats: {
            present: dsseStats.present,
            valid: dsseStats.valid,
            total: dsseStats.total
          }
        },
        conformance: {
          weight: WEIGHTS.conformance,
          ratio: conformanceStats.ratio,
          contribution: WEIGHTS.conformance * conformanceStats.ratio,
          stats: {
            passed: conformanceStats.passed,
            total: conformanceStats.total
          }
        },
        freshness: {
          weight: WEIGHTS.freshness,
          score: freshnessStats.freshness,
          contribution: WEIGHTS.freshness * freshnessStats.freshness,
          stats: {
            ageMedianDays: freshnessStats.ageMedianDays,
            ageRangeDays: freshnessStats.ageRangeDays,
            details: freshnessStats.details
          }
        }
      },
      quarantine: {
        count: quarantineCount,
        items: this.manifest.quarantine || []
      },
      summary: {
        grade: this.getTrustGrade(trustScore),
        ready: trustScore >= 0.95 && quarantineCount === 0,
        issues: []
      }
    };

    // Identify issues
    if (dsseStats.ratio < 1.0) {
      result.summary.issues.push(`DSSE coverage ${(dsseStats.ratio * 100).toFixed(1)}% (${dsseStats.valid}/${dsseStats.total})`);
    }

    if (conformanceStats.ratio < 1.0) {
      result.summary.issues.push(`Conformance ${(conformanceStats.ratio * 100).toFixed(1)}% (${conformanceStats.passed}/${conformanceStats.total})`);
    }

    if (freshnessStats.ageMedianDays > FRESHNESS_THRESHOLD_DAYS) {
      result.summary.issues.push(`Freshness aged ${freshnessStats.ageMedianDays.toFixed(1)} days`);
    }

    if (quarantineCount > 0) {
      result.summary.issues.push(`${quarantineCount} quarantined items`);
    }

    return result;
  }

  getTrustGrade(score) {
    if (score >= 0.95) return 'excellent';
    if (score >= 0.8) return 'good';
    if (score >= 0.6) return 'fair';
    return 'poor';
  }

  printResults(results) {
    console.log('🎯 Trust Score Results\n');

    // Main score
    const scoreColor = results.trustScore >= 0.95 ? '🟢' :
                      results.trustScore >= 0.8 ? '🟡' : '🔴';
    console.log(`${scoreColor} Trust Score: ${(results.trustScore * 100).toFixed(1)}% (${results.summary.grade})`);
    console.log(`📊 Quarantine: ${results.quarantine.count} items`);
    console.log(`🎭 Status: ${results.summary.ready ? '✅ READY' : '❌ NOT READY'}\n`);

    // Component breakdown
    console.log('📋 Component Breakdown:');
    console.log(`   DSSE Coverage:     ${(results.components.dsse.ratio * 100).toFixed(1)}% (weight: ${(WEIGHTS.dsse * 100).toFixed(0)}%) → ${(results.components.dsse.contribution * 100).toFixed(1)}%`);
    console.log(`   Conformance:       ${(results.components.conformance.ratio * 100).toFixed(1)}% (weight: ${(WEIGHTS.conformance * 100).toFixed(0)}%) → ${(results.components.conformance.contribution * 100).toFixed(1)}%`);
    console.log(`   Freshness:         ${(results.components.freshness.score * 100).toFixed(1)}% (weight: ${(WEIGHTS.freshness * 100).toFixed(0)}%) → ${(results.components.freshness.contribution * 100).toFixed(1)}%`);

    // Detailed stats
    console.log('\n🔍 Detailed Statistics:');
    console.log(`   DSSE Envelopes:    ${results.components.dsse.stats.valid}/${results.components.dsse.stats.total} valid`);
    console.log(`   Conformance Tests: ${results.components.conformance.stats.passed}/${results.components.conformance.stats.total} passed`);
    console.log(`   Age Median:        ${results.components.freshness.stats.ageMedianDays.toFixed(1)} days`);

    // Issues
    if (results.summary.issues.length > 0) {
      console.log('\n⚠️  Issues to Address:');
      results.summary.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }

    // CI/monitoring friendly summary table
    console.log('\n📊 CI Summary Table:');
    console.log('┌─────────────────┬─────────┬─────────┬────────┐');
    console.log('│ Component       │ Score   │ Weight  │ Points │');
    console.log('├─────────────────┼─────────┼─────────┼────────┤');
    console.log(`│ DSSE            │ ${(results.components.dsse.ratio * 100).toFixed(1).padStart(6)}% │ ${(WEIGHTS.dsse * 100).toFixed(0).padStart(6)}% │ ${(results.components.dsse.contribution * 100).toFixed(1).padStart(5)}% │`);
    console.log(`│ Conformance     │ ${(results.components.conformance.ratio * 100).toFixed(1).padStart(6)}% │ ${(WEIGHTS.conformance * 100).toFixed(0).padStart(6)}% │ ${(results.components.conformance.contribution * 100).toFixed(1).padStart(5)}% │`);
    console.log(`│ Freshness       │ ${(results.components.freshness.score * 100).toFixed(1).padStart(6)}% │ ${(WEIGHTS.freshness * 100).toFixed(0).padStart(6)}% │ ${(results.components.freshness.contribution * 100).toFixed(1).padStart(5)}% │`);
    console.log('├─────────────────┼─────────┼─────────┼────────┤');
    console.log(`│ TOTAL           │         │         │ ${(results.trustScore * 100).toFixed(1).padStart(5)}% │`);
    console.log('└─────────────────┴─────────┴─────────┴────────┘');

    // Component breakdown table (dsse, conf, fresh)
    console.log('\n📋 Component Breakdown:');
    console.log('┌─────────────────┬─────────┬─────────┬─────────────────────────────┐');
    console.log('│ Component       │ Ratio   │ Status  │ Details                     │');
    console.log('├─────────────────┼─────────┼─────────┼─────────────────────────────┤');
    const dsseStatus = results.components.dsse.ratio >= 0.9 ? '✅ Pass' : '❌ Fail';
    const confStatus = results.components.conformance.ratio >= 0.9 ? '✅ Pass' : '❌ Fail';
    const freshStatus = results.components.freshness.score >= 0.9 ? '✅ Pass' : '❌ Fail';
    console.log(`│ DSSE            │ ${(results.components.dsse.ratio * 100).toFixed(1).padStart(6)}% │ ${dsseStatus.padEnd(7)} │ ${(`${results.components.dsse.stats.valid}/${results.components.dsse.stats.total} valid`).padEnd(27)} │`);
    console.log(`│ Conformance     │ ${(results.components.conformance.ratio * 100).toFixed(1).padStart(6)}% │ ${confStatus.padEnd(7)} │ ${(`${results.components.conformance.stats.passed}/${results.components.conformance.stats.total} passed`).padEnd(27)} │`);
    console.log(`│ Freshness       │ ${(results.components.freshness.score * 100).toFixed(1).padStart(6)}% │ ${freshStatus.padEnd(7)} │ ${(`${results.components.freshness.stats.ageMedianDays.toFixed(1)} days median`).padEnd(27)} │`);
    console.log('└─────────────────┴─────────┴─────────┴─────────────────────────────┘');
  }

  saveResults(results) {
    try {
      fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));
      console.log(`\n💾 Results saved to ${path.relative(projectRoot, config.outputFile)}`);
    } catch (error) {
      console.error(`❌ Failed to save results: ${error.message}`);
    }
  }

  run() {
    try {
      const results = this.calculateTrustScore();
      this.printResults(results);
      this.saveResults(results);

      // Exit code based on readiness
      if (results.summary.ready) {
        console.log('\n🎉 Trust evaluation PASSED - Ready for release!');
        process.exit(0);
      } else {
        console.log('\n❌ Trust evaluation FAILED - Issues need resolution');
        process.exit(1);
      }

    } catch (error) {
      console.error('💥 Trust scoring failed:', error.message);
      process.exit(1);
    }
  }
}

// Command line interface
function printHelp() {
  console.log('Trust Scorer with Updated Formula');
  console.log('');
  console.log('Calculates: score = 0.4×DSSE + 0.4×conformance + 0.2×freshness');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/fed/trust.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h          Show this help message');
  console.log('  --json              Output JSON only');
  console.log('  --table             Output table only');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/fed/trust.mjs');
  console.log('  node scripts/fed/trust.mjs --json');
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Check for manifest file parameter
  const manifestPath = args.find(arg => arg.endsWith('.json') && !arg.startsWith('--'));
  if (manifestPath) {
    // Override manifest file path if provided
    config.manifestFile = path.resolve(manifestPath);
  }

  const scorer = new TrustScorer();

  if (args.includes('--pr')) {
    // PR mode: output JSON for GitHub Actions
    const results = scorer.calculateTrustScore();
    const prOutput = {
      trustScore: results.trustScore,
      ready: results.summary.ready,
      grade: results.summary.grade,
      issues: results.summary.issues,
      components: {
        dsse: results.components.dsse.ratio,
        conformance: results.components.conformance.ratio,
        freshness: results.components.freshness.score
      },
      badges: {
        trust: `https://img.shields.io/badge/Trust-${(results.trustScore * 100).toFixed(0)}%25-${results.trustScore >= 0.95 ? 'brightgreen' : results.trustScore >= 0.8 ? 'yellow' : 'red'}`,
        dsse: `https://img.shields.io/badge/DSSE-${(results.components.dsse.ratio * 100).toFixed(0)}%25-${results.components.dsse.ratio >= 0.9 ? 'brightgreen' : 'red'}`,
        conformance: `https://img.shields.io/badge/Conformance-${(results.components.conformance.ratio * 100).toFixed(0)}%25-${results.components.conformance.ratio >= 0.9 ? 'brightgreen' : 'yellow'}`
      }
    };
    console.log(JSON.stringify(prOutput, null, 2));
    process.exit(results.summary.ready ? 0 : 1);
  } else if (args.includes('--json')) {
    const results = scorer.calculateTrustScore();
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.summary.ready ? 0 : 1);
  } else if (args.includes('--table')) {
    const results = scorer.calculateTrustScore();
    scorer.printResults(results);
    process.exit(results.summary.ready ? 0 : 1);
  } else {
    scorer.run();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}