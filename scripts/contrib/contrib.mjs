#!/usr/bin/env node
// Contributor ranking system - tracks seed contributions
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const seedsDir = "seeds/garden";
const badgesDir = "docs/badges";
fs.mkdirSync(badgesDir, { recursive: true });

// Get git contributors
function getGitContributors() {
  try {
    const log = execSync(
      `git log --pretty=format:"%an|%ae" -- ${seedsDir} 2>/dev/null || true`,
      { encoding: "utf8" }
    );

    const counts = new Map();
    for (const line of log.split("\n").filter(Boolean)) {
      const [name, email] = line.split("|");
      const key = `${name} <${email}>`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return [...counts.entries()]
      .map(([author, commits]) => ({ author, commits }))
      .sort((a, b) => b.commits - a.commits);
  } catch {
    return [];
  }
}

// Analyze seeds for quality metrics
function analyzeSeedQuality() {
  const authors = new Map();

  if (!fs.existsSync(seedsDir)) {
    return [];
  }

  for (const file of fs.readdirSync(seedsDir).filter(x => x.endsWith(".json"))) {
    try {
      const seed = JSON.parse(fs.readFileSync(path.join(seedsDir, file), "utf8"));
      const author = seed.author?.name || seed.author?.did || "anonymous";

      if (!authors.has(author)) {
        authors.set(author, {
          seeds: 0,
          totalNovelty: 0,
          maxNovelty: 0,
          patterns: new Set()
        });
      }

      const stats = authors.get(author);
      stats.seeds++;
      const novelty = seed.metadata?.novelty || seed.meta?.novelty || 0;
      stats.totalNovelty += novelty;
      stats.maxNovelty = Math.max(stats.maxNovelty, novelty);
      if (seed.pattern) stats.patterns.add(seed.pattern);

    } catch {
      // Skip invalid seeds
    }
  }

  return [...authors.entries()].map(([author, stats]) => ({
    author,
    seeds: stats.seeds,
    avgNovelty: stats.seeds > 0 ? stats.totalNovelty / stats.seeds : 0,
    maxNovelty: stats.maxNovelty,
    patterns: stats.patterns.size
  })).sort((a, b) => b.seeds - a.seeds);
}

// Generate badge SVGs
function generateBadge(label, value, color) {
  const labelWidth = label.length * 7 + 10;
  const valueWidth = value.toString().length * 7 + 10;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <rect rx="3" width="${totalWidth}" height="20" fill="#555"/>
  <rect rx="3" x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
  <path fill="${color}" d="M${labelWidth} 0h4v20h-4z"/>
  <rect rx="3" width="${totalWidth}" height="20" fill="url(#b)"/>
  <g fill="#fff" text-anchor="middle" font-family="sans-serif" font-size="11">
    <text x="${labelWidth/2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth/2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth/2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth/2}" y="14">${value}</text>
  </g>
</svg>`;
}

// Main
const gitContrib = getGitContributors();
const seedContrib = analyzeSeedQuality();

// Merge rankings
const rankings = new Map();

for (const g of gitContrib) {
  rankings.set(g.author, {
    author: g.author,
    commits: g.commits,
    seeds: 0,
    avgNovelty: 0,
    maxNovelty: 0,
    patterns: 0
  });
}

for (const s of seedContrib) {
  if (rankings.has(s.author)) {
    Object.assign(rankings.get(s.author), s);
  } else {
    rankings.set(s.author, {
      author: s.author,
      commits: 0,
      ...s
    });
  }
}

// Calculate scores
const leaderboard = [...rankings.values()].map(c => ({
  ...c,
  score: c.seeds * 10 + c.avgNovelty * 100 + c.patterns * 5 + c.commits
})).sort((a, b) => b.score - a.score);

// Generate badges
const topContributor = leaderboard[0];
if (topContributor) {
  // Top contributor badge
  fs.writeFileSync(
    path.join(badgesDir, "top-contributor.svg"),
    generateBadge("top contributor", topContributor.author.split(" ")[0], "#5eea9a")
  );

  // Seeds count badge
  const totalSeeds = leaderboard.reduce((sum, c) => sum + c.seeds, 0);
  fs.writeFileSync(
    path.join(badgesDir, "seeds.svg"),
    generateBadge("seeds", totalSeeds, "#4c9aff")
  );

  // Contributors badge
  fs.writeFileSync(
    path.join(badgesDir, "contributors.svg"),
    generateBadge("contributors", leaderboard.length, "#ff6b6b")
  );
}

// Generate markdown report
const report = [
  "# Contributor Rankings",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Leaderboard",
  "",
  "| Rank | Contributor | Seeds | Avg Novelty | Patterns | Commits | Score |",
  "|------|-------------|-------|-------------|----------|---------|-------|"
];

leaderboard.slice(0, 10).forEach((c, i) => {
  report.push(
    `| ${i + 1} | ${c.author} | ${c.seeds} | ${c.avgNovelty.toFixed(3)} | ${c.patterns} | ${c.commits} | ${Math.round(c.score)} |`
  );
});

report.push(
  "",
  "## Scoring Formula",
  "",
  "```",
  "score = seeds × 10 + avgNovelty × 100 + patterns × 5 + commits",
  "```",
  "",
  "## Badges",
  "",
  "- ![Top Contributor](badges/top-contributor.svg)",
  "- ![Seeds](badges/seeds.svg)",
  "- ![Contributors](badges/contributors.svg)"
);

fs.writeFileSync("docs/CONTRIBUTORS.md", report.join("\n"));

// Output summary
console.log(`Contributors: ${leaderboard.length}`);
console.log(`Total seeds: ${leaderboard.reduce((s, c) => s + c.seeds, 0)}`);
console.log(`Top contributor: ${topContributor?.author || "none"}`);
console.log("");
console.log("Badges generated in docs/badges/");
console.log("Report generated: docs/CONTRIBUTORS.md");