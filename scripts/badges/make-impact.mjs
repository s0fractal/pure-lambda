#!/usr/bin/env node

/**
 * Impact Badge Generator
 * Creates SVG badge for README
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

function generateImpactBadge() {
  // Find latest impact report
  const impactDir = path.join(projectRoot, 'reports', 'impact');

  let latestImpact = {
    co2_saved_kg: 0,
    auto_merge_rate: 0
  };

  if (fs.existsSync(impactDir)) {
    const files = fs.readdirSync(impactDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length > 0) {
      const latestPath = path.join(impactDir, files[0]);
      latestImpact = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
    }
  }

  const co2Text = `${latestImpact.co2_saved_kg} kg CO₂`;
  const color = latestImpact.auto_merge_rate >= 80 ? '#00cc00' :
                latestImpact.auto_merge_rate >= 60 ? '#ffcc00' : '#ff6666';

  // Generate SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="20">
    <linearGradient id="gradient">
      <stop offset="0%" style="stop-color:#555"/>
      <stop offset="100%" style="stop-color:${color}"/>
    </linearGradient>
    <rect width="150" height="20" fill="url(#gradient)"/>
    <text x="40" y="14" fill="#fff" font-size="11" font-family="Arial">impact</text>
    <text x="100" y="14" fill="#fff" font-size="11" font-family="Arial">${co2Text}</text>
  </svg>`;

  // Save badge
  const badgesDir = path.join(projectRoot, 'dist', 'badges');
  fs.mkdirSync(badgesDir, { recursive: true });
  fs.writeFileSync(path.join(badgesDir, 'impact.svg'), svg);

  console.log('🏷️ Impact badge generated');
  console.log(`  CO₂ saved: ${latestImpact.co2_saved_kg} kg`);
  console.log(`  Auto-merge: ${latestImpact.auto_merge_rate}%`);
  console.log('  Badge: dist/badges/impact.svg');
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  generateImpactBadge();
}

export { generateImpactBadge };