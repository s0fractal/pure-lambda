#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

function generateBadge(label, message, color) {
  const labelWidth = label.length * 7 + 10;
  const messageWidth = message.length * 7 + 10;
  const totalWidth = labelWidth + messageWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
    <linearGradient id="b" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <mask id="a">
      <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
    </mask>
    <g mask="url(#a)">
      <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
      <path fill="${color}" d="M${labelWidth} 0h${messageWidth}v20H${labelWidth}z"/>
      <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
      <text x="${labelWidth/2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
      <text x="${labelWidth/2}" y="14">${label}</text>
      <text x="${labelWidth + messageWidth/2}" y="15" fill="#010101" fill-opacity=".3">${message}</text>
      <text x="${labelWidth + messageWidth/2}" y="14">${message}</text>
    </g>
  </svg>`;
}

function getTrustColor(score) {
  if (score >= 95) return '#4c1';
  if (score >= 85) return '#97CA00';
  if (score >= 70) return '#dfb317';
  if (score >= 50) return '#fe7d37';
  return '#e05d44';
}

function getConformanceColor(score) {
  if (score >= 95) return '#4c1';
  if (score >= 90) return '#97CA00';
  if (score >= 80) return '#dfb317';
  if (score >= 60) return '#fe7d37';
  return '#e05d44';
}

function createBadges(validationResult) {
  const badges = {};

  // Trust score badge
  const trustScore = Math.round(validationResult.trust.trustScore * 100);
  badges.trust = generateBadge(
    'trust',
    `${trustScore}%`,
    getTrustColor(trustScore)
  );

  // Conformance badge
  const conformanceScore = Math.round(validationResult.conformance.score || 0);
  badges.conformance = generateBadge(
    'conformance',
    `${conformanceScore}%`,
    getConformanceColor(conformanceScore)
  );

  // DSSE badge
  const dsseValid = validationResult.dsse?.valid || false;
  const dsseColor = dsseValid ? '#4c1' : '#e05d44';
  badges.dsse = generateBadge(
    'DSSE',
    dsseValid ? 'valid' : 'invalid',
    dsseColor
  );

  // Ready badge
  const isReady = validationResult.ready;
  badges.ready = generateBadge(
    'ready',
    isReady ? 'yes' : 'no',
    isReady ? '#4c1' : '#e05d44'
  );

  // Size badge
  const sizeKB = Math.round(validationResult.seed?.sizeKB || 0);
  const sizeColor = sizeKB <= 50 ? '#4c1' : sizeKB <= 100 ? '#dfb317' : '#e05d44';
  badges.size = generateBadge(
    'size',
    `${sizeKB}KB`,
    sizeColor
  );

  return badges;
}

// CLI interface
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/badges.mjs <validation.json> [output-dir]');
    console.log('');
    console.log('Creates SVG badges from validation results.');
    console.log('Badges: trust, conformance, dsse, ready, size');
    process.exit(1);
  }

  const validationPath = args[0];
  const outputDir = args[1] || 'out/badges';

  try {
    // Read validation results
    if (!fs.existsSync(validationPath)) {
      throw new Error(`Validation file not found: ${validationPath}`);
    }

    const validationResult = JSON.parse(fs.readFileSync(validationPath, 'utf8'));

    // Create badges
    const badges = createBadges(validationResult);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write badge files
    let createdCount = 0;
    for (const [name, svg] of Object.entries(badges)) {
      const badgePath = path.join(outputDir, `${name}.svg`);
      fs.writeFileSync(badgePath, svg);
      console.log(`✅ Created: ${badgePath}`);
      createdCount++;
    }

    console.log(`🏅 Generated ${createdCount} badges in ${outputDir}`);

    // Output summary for GitHub Actions
    if (process.env.GITHUB_ACTIONS) {
      const trustScore = Math.round(validationResult.trust.trustScore * 100);
      console.log(`::set-output name=trust-score::${trustScore}`);
      console.log(`::set-output name=ready::${validationResult.ready}`);
      console.log(`::set-output name=badges-dir::${outputDir}`);
    }

  } catch (error) {
    console.error(`❌ Badge generation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createBadges, generateBadge };