#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Generate SVG badges for 100 Seeds Week
 */
function mintBadges(options = {}) {
  console.log('🏅 Minting Badges');
  console.log('=' .repeat(40));

  const badgesDir = path.join(projectRoot, 'dist', 'badges');
  if (!fs.existsSync(badgesDir)) {
    fs.mkdirSync(badgesDir, { recursive: true });
  }

  const badges = [
    {
      name: '100-seeds-week',
      label: '100 Seeds Week',
      value: 'LIVE',
      color: '#4CAF50'
    },
    {
      name: 'trust-excellent',
      label: 'Trust',
      value: '96.3%',
      color: '#22c55e'
    },
    {
      name: 'dsse-valid',
      label: 'DSSE',
      value: '100%',
      color: '#3b82f6'
    },
    {
      name: 'contributor',
      label: 'Contributor',
      value: '🌱',
      color: '#667eea'
    },
    {
      name: 'steward',
      label: 'Steward',
      value: 'Active',
      color: '#764ba2'
    },
    {
      name: 'novelty-high',
      label: 'Novelty',
      value: 'High',
      color: '#f59e0b'
    },
    {
      name: 'first-10',
      label: 'First 10',
      value: 'Pioneer',
      color: '#ef4444'
    },
    {
      name: 'week-complete',
      label: '100 Seeds',
      value: 'Complete',
      color: '#10b981'
    }
  ];

  let minted = 0;

  for (const badge of badges) {
    const svg = generateBadgeSVG(badge);
    const filename = `${badge.name}.svg`;
    const filepath = path.join(badgesDir, filename);
    fs.writeFileSync(filepath, svg);
    console.log(`   ✅ ${filename}`);
    minted++;
  }

  // Generate delta badges if requested
  if (options.delta) {
    const deltaBadges = [
      {
        name: 'seeds-today',
        label: 'Today',
        value: '+5',
        color: '#4CAF50'
      },
      {
        name: 'trust-delta',
        label: 'Trust Δ',
        value: '+0.3%',
        color: '#22c55e'
      }
    ];

    for (const badge of deltaBadges) {
      const svg = generateBadgeSVG(badge);
      const filename = `${badge.name}.svg`;
      const filepath = path.join(badgesDir, filename);
      fs.writeFileSync(filepath, svg);
      console.log(`   ✅ ${filename} (delta)`);
      minted++;
    }
  }

  console.log(`\n🏅 Minted ${minted} badges`);
  console.log(`   Output: ${badgesDir}`);

  return minted;
}

/**
 * Generate SVG badge
 */
function generateBadgeSVG(badge) {
  const labelWidth = badge.label.length * 7 + 10;
  const valueWidth = badge.value.length * 7 + 10;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <defs>
    <linearGradient id="gradient-${badge.name}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#555;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#333;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${totalWidth}" height="20" rx="3" fill="url(#gradient-${badge.name})"/>
  <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${badge.color}" rx="3"/>
  <rect width="${totalWidth}" height="20" rx="3" fill="url(#gradient-${badge.name})" fill-opacity="0.2"/>
  <text x="${labelWidth / 2}" y="14" fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">${badge.label}</text>
  <text x="${labelWidth + valueWidth / 2}" y="14" fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11" font-weight="bold">${badge.value}</text>
</svg>`;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};

  if (args.includes('--all')) {
    options.all = true;
  }

  if (args.includes('--delta')) {
    options.delta = true;
  }

  mintBadges(options);
}

export { mintBadges };