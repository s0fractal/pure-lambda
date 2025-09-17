#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Other Badges Generator
 *
 * Generates additional SVG badges including:
 * - Conformance badge
 * - DSSE attestation badge
 * - SLO badges (W-SLO, κ-SLO)
 * - Regret badge
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { generateBadgeURL, readLastWindow, readRegretSummary } from '../badges.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Configuration
const config = {
  badgesDir: path.join(projectRoot, 'docs', 'badges'),
  trustScoreFile: path.join(projectRoot, 'trust-score.json'),
  csvPath: path.join(projectRoot, 'observability', 'branchial.csv'),
  conformanceFile: path.join(projectRoot, 'test-results', 'conformance.json')
};

// Badge colors
const BADGE_COLORS = {
  excellent: '#00C851',  // Green
  good: '#33B5E5',      // Blue
  fair: '#FF8800',      // Orange
  poor: '#FF4444',      // Red
  gray: '#6c757d'       // Gray
};

class OtherBadgeGenerator {
  constructor() {
    this.trustData = this.loadTrustData();
    this.sloData = this.loadSLOData();
    this.regretData = readRegretSummary();
  }

  loadTrustData() {
    try {
      if (fs.existsSync(config.trustScoreFile)) {
        return JSON.parse(fs.readFileSync(config.trustScoreFile, 'utf8'));
      }
    } catch (error) {
      console.warn('⚠️  Failed to load trust data:', error.message);
    }

    return {
      trustScore: 0,
      components: {
        dsse: { ratio: 0, stats: { valid: 0, total: 0 } },
        conformance: { ratio: 0, stats: { passed: 0, total: 0 } },
        freshness: { score: 0, stats: { ageMedianDays: 0 } }
      },
      summary: { grade: 'poor' },
      quarantine: { count: 0 }
    };
  }

  loadSLOData() {
    return readLastWindow(config.csvPath);
  }

  getGradeColor(ratio) {
    if (ratio >= 1.0) return BADGE_COLORS.excellent;
    if (ratio >= 0.9) return BADGE_COLORS.good;
    if (ratio >= 0.7) return BADGE_COLORS.fair;
    return BADGE_COLORS.poor;
  }

  createSVGBadge(leftText, rightText, rightColor, rightWidth = 50) {
    const leftWidth = 104 - rightWidth;
    const totalWidth = 104;
    const height = 20;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${height}">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#a)">
    <path fill="#555" d="M0 0h${leftWidth}v${height}H0z"/>
    <path fill="${rightColor}" d="M${leftWidth} 0h${rightWidth}v${height}H${leftWidth}z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v${height}H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${leftWidth/2}" y="15" fill="#010101" fill-opacity=".3">${leftText}</text>
    <text x="${leftWidth/2}" y="14">${leftText}</text>
    <text x="${leftWidth + rightWidth/2}" y="15" fill="#010101" fill-opacity=".3">${rightText}</text>
    <text x="${leftWidth + rightWidth/2}" y="14">${rightText}</text>
  </g>
</svg>`;

    return svg;
  }

  generateConformanceBadge() {
    const conformance = this.trustData.components.conformance;
    const ratio = conformance.ratio;
    const passed = conformance.stats.passed;
    const total = conformance.stats.total;

    let label;
    if (ratio >= 1.0) {
      label = 'PASS';
    } else if (ratio >= 0.9) {
      label = 'GOOD';
    } else if (ratio >= 0.7) {
      label = 'FAIR';
    } else {
      label = 'FAIL';
    }

    const color = this.getGradeColor(ratio);
    const scoreText = total > 0 ? `${passed}/${total}` : 'N/A';

    return {
      svg: this.createSVGBadge('Conformance', `${scoreText} ${label}`, color, 75),
      filename: 'conformance.svg'
    };
  }

  generateDSSEBadge() {
    const dsse = this.trustData.components.dsse;
    const ratio = dsse.ratio;
    const valid = dsse.stats.valid;
    const total = dsse.stats.total;

    let label;
    if (ratio >= 1.0) {
      label = 'FULL';
    } else if (ratio >= 0.9) {
      label = 'GOOD';
    } else if (ratio >= 0.5) {
      label = 'PARTIAL';
    } else {
      label = 'POOR';
    }

    const color = this.getGradeColor(ratio);
    const scoreText = total > 0 ? `${valid}/${total}` : 'N/A';

    return {
      svg: this.createSVGBadge('DSSE', `${scoreText} ${label}`, color, 75),
      filename: 'dsse.svg'
    };
  }

  generateQuarantineBadge() {
    const count = this.trustData.quarantine.count;
    let label, color;

    if (count === 0) {
      label = 'CLEAN';
      color = BADGE_COLORS.excellent;
    } else if (count <= 2) {
      label = 'MINOR';
      color = BADGE_COLORS.fair;
    } else {
      label = 'ISSUES';
      color = BADGE_COLORS.poor;
    }

    return {
      svg: this.createSVGBadge('Quarantine', `${count} ${label}`, color, 75),
      filename: 'quarantine.svg'
    };
  }

  generateSLOBadge() {
    let wSLO = 'N/A', kappaSLO = 'N/A';

    if (this.sloData) {
      if (this.sloData.W !== undefined && this.sloData.W !== '') {
        const wValue = parseFloat(this.sloData.W);
        if (!isNaN(wValue)) {
          wSLO = Math.abs(wValue).toFixed(1) + '%';
        }
      }

      if (this.sloData.kappa !== undefined && this.sloData.kappa !== '') {
        const kappaValue = parseFloat(this.sloData.kappa);
        if (!isNaN(kappaValue)) {
          kappaSLO = Math.abs(kappaValue * 100).toFixed(1) + '%';
        }
      }
    }

    const getSLOColor = (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) return BADGE_COLORS.gray;
      if (num >= 85) return BADGE_COLORS.excellent;
      if (num >= 70) return BADGE_COLORS.fair;
      return BADGE_COLORS.poor;
    };

    return [
      {
        svg: this.createSVGBadge('W-SLO', wSLO, getSLOColor(wSLO), 50),
        filename: 'w-slo.svg'
      },
      {
        svg: this.createSVGBadge('κ-SLO', kappaSLO, getSLOColor(kappaSLO), 50),
        filename: 'kappa-slo.svg'
      }
    ];
  }

  generateRegretBadge() {
    const regretValue = this.regretData.avg;
    const color = regretValue === 'N/A' ? BADGE_COLORS.gray : BADGE_COLORS.good;

    return {
      svg: this.createSVGBadge('Regret', regretValue, color, 50),
      filename: 'regret.svg'
    };
  }

  generateAllBadges() {
    console.log('🏷️  Generating additional badges...\n');

    // Ensure badges directory exists
    fs.mkdirSync(config.badgesDir, { recursive: true });

    const badges = [
      this.generateConformanceBadge(),
      this.generateDSSEBadge(),
      this.generateQuarantineBadge(),
      ...this.generateSLOBadge(),
      this.generateRegretBadge()
    ];

    const results = [];

    // Write all badge files
    for (const badge of badges) {
      try {
        const filePath = path.join(config.badgesDir, badge.filename);
        fs.writeFileSync(filePath, badge.svg);

        const relativePath = path.relative(projectRoot, filePath);
        console.log(`✅ Generated ${badge.filename}: ${relativePath}`);

        results.push({
          name: badge.filename,
          path: relativePath,
          size: Buffer.byteLength(badge.svg, 'utf8'),
          success: true
        });

      } catch (error) {
        console.log(`❌ Failed to generate ${badge.filename}: ${error.message}`);
        results.push({
          name: badge.filename,
          path: null,
          size: 0,
          success: false,
          error: error.message
        });
      }
    }

    // Generate summary
    const successful = results.filter(r => r.success).length;
    const totalSize = results.reduce((sum, r) => sum + r.size, 0);

    console.log(`\n📊 Badge Generation Summary:`);
    console.log(`   Additional badges: ${successful}/${results.length}`);
    console.log(`   Total size: ${totalSize} bytes`);
    console.log(`   Output directory: ${path.relative(projectRoot, config.badgesDir)}`);

    // Display badge metrics
    console.log(`\n🏷️  Badge Metrics:`);
    const conformanceStats = this.trustData.components.conformance.stats;
    console.log(`   Conformance: ${conformanceStats.passed}/${conformanceStats.total} tests passed`);

    const dsseStats = this.trustData.components.dsse.stats;
    console.log(`   DSSE: ${dsseStats.valid}/${dsseStats.total} artifacts signed`);

    console.log(`   Quarantine: ${this.trustData.quarantine.count} items`);

    if (this.sloData) {
      console.log(`   W-SLO: ${this.sloData.W || 'N/A'}`);
      console.log(`   κ-SLO: ${this.sloData.kappa || 'N/A'}`);
    }

    console.log(`   Regret: ${this.regretData.avg}`);

    if (successful === results.length) {
      console.log('\n🎉 All additional badges generated successfully!');
      return { success: true, badges: results };
    } else {
      console.log('\n⚠️  Some badges failed to generate');
      return { success: false, badges: results };
    }
  }
}

// Command line interface
function printHelp() {
  console.log('Other Badges Generator');
  console.log('');
  console.log('Generates additional SVG badges for conformance, DSSE, SLO metrics, etc.');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/badges/others.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h          Show this help message');
  console.log('');
  console.log('Generated badges:');
  console.log('  • conformance.svg   - Conformance test results');
  console.log('  • dsse.svg          - DSSE attestation coverage');
  console.log('  • quarantine.svg    - Quarantine status');
  console.log('  • w-slo.svg         - W-SLO metrics');
  console.log('  • kappa-slo.svg     - κ-SLO metrics');
  console.log('  • regret.svg        - Regret metrics');
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  try {
    const generator = new OtherBadgeGenerator();
    const result = generator.generateAllBadges();
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('💥 Badge generation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { OtherBadgeGenerator };