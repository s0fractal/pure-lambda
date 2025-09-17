#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Offline Trust Badges Generator
 *
 * Generates SVG badges for trust metrics:
 * - docs/badges/trust.svg (Good/Excellent)
 * - docs/badges/conformance.svg
 * - docs/badges/dsse.svg
 * - docs/badges/freshness.svg
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Configuration
const config = {
  badgesDir: path.join(projectRoot, 'docs', 'badges'),
  trustScoreFile: path.join(projectRoot, 'trust-score.json'),
  outputFiles: {
    trust: path.join(projectRoot, 'docs', 'badges', 'trust.svg'),
    conformance: path.join(projectRoot, 'docs', 'badges', 'conformance.svg'),
    dsse: path.join(projectRoot, 'docs', 'badges', 'dsse.svg'),
    freshness: path.join(projectRoot, 'docs', 'badges', 'freshness.svg')
  }
};

// Badge colors and styling
const BADGE_COLORS = {
  excellent: '#00C851',  // Green
  good: '#33B5E5',      // Blue
  fair: '#FF8800',      // Orange
  poor: '#FF4444',      // Red
  gray: '#6c757d'       // Gray for missing data
};

const BADGE_STYLES = {
  width: 104,
  height: 20,
  fontSize: 11,
  fontFamily: 'Verdana,Geneva,DejaVu Sans,sans-serif'
};

class BadgeGenerator {
  constructor() {
    this.trustData = this.loadTrustData();
  }

  loadTrustData() {
    try {
      if (fs.existsSync(config.trustScoreFile)) {
        return JSON.parse(fs.readFileSync(config.trustScoreFile, 'utf8'));
      }
    } catch (error) {
      console.warn('⚠️  Failed to load trust data:', error.message);
    }

    // Default/fallback data
    return {
      trustScore: 0,
      components: {
        dsse: { ratio: 0, stats: { valid: 0, total: 0 } },
        conformance: { ratio: 0, stats: { passed: 0, total: 0 } },
        freshness: { score: 0, stats: { ageMedianDays: 0 } }
      },
      summary: { grade: 'poor' }
    };
  }

  getScoreGrade(score) {
    if (score >= 0.95) return 'excellent';
    if (score >= 0.8) return 'good';
    if (score >= 0.6) return 'fair';
    return 'poor';
  }

  getGradeLabel(grade) {
    switch (grade) {
      case 'excellent': return 'EXCELLENT';
      case 'good': return 'GOOD';
      case 'fair': return 'FAIR';
      case 'poor': return 'POOR';
      default: return 'UNKNOWN';
    }
  }

  createSVGBadge(leftText, rightText, rightColor, rightWidth = 50) {
    const leftWidth = BADGE_STYLES.width - rightWidth;
    const totalWidth = BADGE_STYLES.width;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${BADGE_STYLES.height}">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="${totalWidth}" height="${BADGE_STYLES.height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#a)">
    <path fill="#555" d="M0 0h${leftWidth}v${BADGE_STYLES.height}H0z"/>
    <path fill="${rightColor}" d="M${leftWidth} 0h${rightWidth}v${BADGE_STYLES.height}H${leftWidth}z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v${BADGE_STYLES.height}H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="${BADGE_STYLES.fontFamily}" font-size="${BADGE_STYLES.fontSize}">
    <text x="${leftWidth/2}" y="15" fill="#010101" fill-opacity=".3">${leftText}</text>
    <text x="${leftWidth/2}" y="14">${leftText}</text>
    <text x="${leftWidth + rightWidth/2}" y="15" fill="#010101" fill-opacity=".3">${rightText}</text>
    <text x="${leftWidth + rightWidth/2}" y="14">${rightText}</text>
  </g>
</svg>`;

    return svg;
  }

  generateTrustBadge() {
    const score = this.trustData.trustScore;
    const grade = this.getScoreGrade(score);
    const label = this.getGradeLabel(grade);
    const color = BADGE_COLORS[grade];
    const percentage = `${(score * 100).toFixed(0)}%`;

    return this.createSVGBadge('Trust', `${percentage} ${label}`, color, 75);
  }

  generateConformanceBadge() {
    const conformance = this.trustData.components.conformance;
    const ratio = conformance.ratio;
    const passed = conformance.stats.passed;
    const total = conformance.stats.total;

    let grade, label;
    if (ratio >= 1.0) {
      grade = 'excellent';
      label = 'PASS';
    } else if (ratio >= 0.9) {
      grade = 'good';
      label = 'GOOD';
    } else if (ratio >= 0.7) {
      grade = 'fair';
      label = 'FAIR';
    } else {
      grade = 'poor';
      label = 'FAIL';
    }

    const color = BADGE_COLORS[grade];
    const scoreText = total > 0 ? `${passed}/${total}` : 'N/A';

    return this.createSVGBadge('Conformance', `${scoreText} ${label}`, color, 75);
  }

  generateDSSEBadge() {
    const dsse = this.trustData.components.dsse;
    const ratio = dsse.ratio;
    const valid = dsse.stats.valid;
    const total = dsse.stats.total;

    let grade, label;
    if (ratio >= 1.0) {
      grade = 'excellent';
      label = 'FULL';
    } else if (ratio >= 0.9) {
      grade = 'good';
      label = 'GOOD';
    } else if (ratio >= 0.5) {
      grade = 'fair';
      label = 'PARTIAL';
    } else {
      grade = 'poor';
      label = 'POOR';
    }

    const color = BADGE_COLORS[grade];
    const scoreText = total > 0 ? `${valid}/${total}` : 'N/A';

    return this.createSVGBadge('DSSE', `${scoreText} ${label}`, color, 75);
  }

  generateFreshnessBadge() {
    const freshness = this.trustData.components.freshness;
    const score = freshness.score;
    const ageDays = freshness.stats.ageMedianDays;

    let grade, label;
    if (score >= 0.9) {
      grade = 'excellent';
      label = 'FRESH';
    } else if (score >= 0.7) {
      grade = 'good';
      label = 'GOOD';
    } else if (score >= 0.5) {
      grade = 'fair';
      label = 'AGING';
    } else {
      grade = 'poor';
      label = 'STALE';
    }

    const color = BADGE_COLORS[grade];
    const ageText = ageDays < 1 ? '<1d' :
                   ageDays < 10 ? `${Math.round(ageDays)}d` :
                   `${Math.round(ageDays)}d`;

    return this.createSVGBadge('Freshness', `${ageText} ${label}`, color, 75);
  }

  generateAllBadges() {
    console.log('🏷️  Generating trust badges...\n');

    // Ensure badges directory exists
    fs.mkdirSync(config.badgesDir, { recursive: true });

    const badges = {
      trust: this.generateTrustBadge(),
      conformance: this.generateConformanceBadge(),
      dsse: this.generateDSSEBadge(),
      freshness: this.generateFreshnessBadge()
    };

    const results = [];

    // Write all badge files
    for (const [name, svg] of Object.entries(badges)) {
      try {
        const filePath = config.outputFiles[name];
        fs.writeFileSync(filePath, svg);

        const relativePath = path.relative(projectRoot, filePath);
        console.log(`✅ Generated ${name} badge: ${relativePath}`);

        results.push({
          name,
          path: relativePath,
          size: Buffer.byteLength(svg, 'utf8'),
          success: true
        });

      } catch (error) {
        console.log(`❌ Failed to generate ${name} badge: ${error.message}`);
        results.push({
          name,
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
    console.log(`   Badges generated: ${successful}/${results.length}`);
    console.log(`   Total size: ${totalSize} bytes`);
    console.log(`   Output directory: ${path.relative(projectRoot, config.badgesDir)}`);

    // Display badge information
    console.log(`\n🏷️  Badge Details:`);
    if (results.find(r => r.name === 'trust' && r.success)) {
      const trustGrade = this.getGradeLabel(this.getScoreGrade(this.trustData.trustScore));
      const trustScore = (this.trustData.trustScore * 100).toFixed(0);
      console.log(`   Trust: ${trustScore}% ${trustGrade}`);
    }

    const conformanceStats = this.trustData.components.conformance.stats;
    if (results.find(r => r.name === 'conformance' && r.success)) {
      console.log(`   Conformance: ${conformanceStats.passed}/${conformanceStats.total} tests passed`);
    }

    const dsseStats = this.trustData.components.dsse.stats;
    if (results.find(r => r.name === 'dsse' && r.success)) {
      console.log(`   DSSE: ${dsseStats.valid}/${dsseStats.total} artifacts signed`);
    }

    const freshnessStats = this.trustData.components.freshness.stats;
    if (results.find(r => r.name === 'freshness' && r.success)) {
      console.log(`   Freshness: ${freshnessStats.ageMedianDays.toFixed(1)} days median age`);
    }

    if (successful === results.length) {
      console.log('\n🎉 All badges generated successfully!');
      return { success: true, badges: results };
    } else {
      console.log('\n⚠️  Some badges failed to generate');
      return { success: false, badges: results };
    }
  }

  generateMarkdownTable() {
    // Generate markdown table for embedding in docs
    const badges = [
      { name: 'Trust', path: 'docs/badges/trust.svg' },
      { name: 'Conformance', path: 'docs/badges/conformance.svg' },
      { name: 'DSSE', path: 'docs/badges/dsse.svg' },
      { name: 'Freshness', path: 'docs/badges/freshness.svg' }
    ];

    const markdown = badges.map(badge =>
      `![${badge.name}](${badge.path})`
    ).join(' ');

    console.log('\n📝 Markdown for embedding:');
    console.log(markdown);

    // Also generate HTML version
    const html = badges.map(badge =>
      `<img src="${badge.path}" alt="${badge.name}" style="margin-right: 4px;">`
    ).join('');

    console.log('\n🌐 HTML for embedding:');
    console.log(html);

    return { markdown, html };
  }
}

// Command line interface
function printHelp() {
  console.log('Offline Trust Badges Generator');
  console.log('');
  console.log('Generates SVG badges for trust metrics based on trust-score.json');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/badges/trust-badge.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h          Show this help message');
  console.log('  --markdown          Show markdown embedding code');
  console.log('  --html              Show HTML embedding code');
  console.log('');
  console.log('Generated badges:');
  console.log('  • docs/badges/trust.svg       - Overall trust score');
  console.log('  • docs/badges/conformance.svg - Conformance test results');
  console.log('  • docs/badges/dsse.svg        - DSSE attestation coverage');
  console.log('  • docs/badges/freshness.svg   - Artifact freshness score');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/badges/trust-badge.mjs');
  console.log('  node scripts/badges/trust-badge.mjs --markdown');
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  try {
    const generator = new BadgeGenerator();
    const result = generator.generateAllBadges();

    if (args.includes('--markdown') || args.includes('--html')) {
      generator.generateMarkdownTable();
    }

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