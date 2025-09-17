#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Quarantine Generator
 *
 * Reads observability/branchial.csv and observability/breath-slo.yaml
 * If W explodes or kappa>kmax for span (per SLO): select lowest-score 30% branches → mark frozen for 1 tick
 * Emits observability/quarantine.json with deterministic ordering
 */

class QuarantineGenerator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.branchialPath = path.join(this.projectRoot, 'observability/branchial.csv');
    this.sloPath = path.join(this.projectRoot, 'observability/breath-slo.yaml');
    this.outputPath = path.join(this.projectRoot, 'observability/quarantine.json');
  }

  async generate() {
    try {
      // Read input files
      const branchialData = await this.readBranchialData();
      const sloConfig = await this.readSLOConfig();

      // Analyze for violations
      const violations = this.analyzeViolations(branchialData, sloConfig);

      // Select branches for quarantine
      const quarantineBranches = this.selectQuarantineBranches(branchialData, violations);

      // Generate quarantine configuration
      const quarantineConfig = {
        frozen: quarantineBranches,
        thawStepPct: 0.10,
        reason: this.generateReason(violations),
        ts: new Date().toISOString()
      };

      // Write output
      await this.writeQuarantineConfig(quarantineConfig);

      console.log(`Quarantine generated: ${quarantineBranches.length} branches frozen`);
      console.log(`Reason: ${quarantineConfig.reason}`);

      return quarantineConfig;

    } catch (error) {
      console.error('Error generating quarantine:', error.message);
      process.exit(1);
    }
  }

  async readBranchialData() {
    const content = fs.readFileSync(this.branchialPath, 'utf-8');
    const lines = content.trim().split('\\n');

    if (lines.length === 0) {
      throw new Error('Empty branchial.csv file');
    }

    const header = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= header.length) {
        const row = {};
        for (let j = 0; j < header.length; j++) {
          const value = values[j].trim();
          // Try to parse as number, otherwise keep as string
          row[header[j].trim()] = isNaN(parseFloat(value)) ? value : parseFloat(value);
        }

        // Extract branch ID from various possible formats
        if (typeof row.t === 'string' && row.t.includes('autopilot')) {
          row.branchId = row.t;
        } else if (row.branchId) {
          // Already has branchId
        } else {
          // Generate synthetic branch ID
          row.branchId = `branch_${i}`;
        }

        data.push(row);
      }
    }

    return data;
  }

  async readSLOConfig() {
    const content = fs.readFileSync(this.sloPath, 'utf-8');
    return YAML.parse(content);
  }

  analyzeViolations(branchialData, sloConfig) {
    const violations = {
      widthViolations: [],
      kappaViolations: [],
      regretViolations: []
    };

    const widthRange = sloConfig.slos.width.range;
    const kappaRange = sloConfig.slos.curvature.range;
    const regretThresholds = sloConfig.slos.regret.metrics;

    for (const row of branchialData) {
      const branchId = row.branchId;
      const W = typeof row.W === 'number' ? row.W : parseFloat(row.W) || 0;
      const kappa = typeof row.kappa === 'number' ? row.kappa : parseFloat(row.kappa) || 0;
      const regret = typeof row.regret === 'number' ? row.regret : parseFloat(row.regret) || 0;

      // Check width violations (W explodes)
      if (W < widthRange[0] || W > widthRange[1]) {
        violations.widthViolations.push({
          branchId,
          value: W,
          threshold: widthRange,
          score: this.calculateBranchScore(row)
        });
      }

      // Check kappa violations
      if (kappa < kappaRange[0] || kappa > kappaRange[1]) {
        violations.kappaViolations.push({
          branchId,
          value: kappa,
          threshold: kappaRange,
          score: this.calculateBranchScore(row)
        });
      }

      // Check regret violations
      if (regret > regretThresholds.average.threshold) {
        violations.regretViolations.push({
          branchId,
          value: regret,
          threshold: regretThresholds.average.threshold,
          score: this.calculateBranchScore(row)
        });
      }
    }

    return violations;
  }

  calculateBranchScore(row) {
    // Calculate a score for the branch based on various metrics
    // Lower score means worse performance (more likely to be quarantined)
    const W = typeof row.W === 'number' ? row.W : parseFloat(row.W) || 0;
    const kappa = typeof row.kappa === 'number' ? row.kappa : parseFloat(row.kappa) || 0;
    const regret = typeof row.regret === 'number' ? row.regret : parseFloat(row.regret) || 0;
    const L = typeof row.L === 'number' ? row.L : parseFloat(row.L) || 100;

    // Score formula: higher is better
    // Penalize high W, extreme kappa (positive or negative), high regret, high L
    let score = 100;
    score -= Math.abs(W - 16) * 2; // Optimal W around 16
    score -= Math.abs(kappa) * 50; // Penalize deviation from 0
    score -= regret * 10; // Penalize regret
    score -= (L - 100) * 0.1; // Penalize high latency

    return Math.max(0, score);
  }

  selectQuarantineBranches(branchialData, violations) {
    // Collect all violating branches with their scores
    const allViolations = [
      ...violations.widthViolations,
      ...violations.kappaViolations,
      ...violations.regretViolations
    ];

    // Remove duplicates and sort by score (ascending - worst first)
    const uniqueBranches = new Map();
    for (const violation of allViolations) {
      if (!uniqueBranches.has(violation.branchId) ||
          uniqueBranches.get(violation.branchId).score > violation.score) {
        uniqueBranches.set(violation.branchId, violation);
      }
    }

    const sortedViolations = Array.from(uniqueBranches.values())
      .sort((a, b) => a.score - b.score);

    // Select lowest-score 30% for quarantine
    const quarantineCount = Math.max(1, Math.floor(sortedViolations.length * 0.3));
    const selectedBranches = sortedViolations
      .slice(0, quarantineCount)
      .map(v => v.branchId);

    // Ensure deterministic ordering
    return selectedBranches.sort();
  }

  generateReason(violations) {
    const reasons = [];

    if (violations.widthViolations.length > 0) {
      reasons.push(`Width violations: ${violations.widthViolations.length}`);
    }

    if (violations.kappaViolations.length > 0) {
      reasons.push(`Curvature violations: ${violations.kappaViolations.length}`);
    }

    if (violations.regretViolations.length > 0) {
      reasons.push(`Regret violations: ${violations.regretViolations.length}`);
    }

    if (reasons.length === 0) {
      return 'No violations detected - preventive quarantine';
    }

    return reasons.join(', ') + ' - quarantining worst performing 30%';
  }

  async writeQuarantineConfig(config) {
    fs.writeFileSync(this.outputPath, JSON.stringify(config, null, 2));
  }
}

// Main execution
async function main() {
  console.log('Generating quarantine configuration...');

  const generator = new QuarantineGenerator();
  await generator.generate();

  console.log('Quarantine generation completed successfully');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { QuarantineGenerator };