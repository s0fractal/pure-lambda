#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execFileSync } from "node:child_process";

async function makeSnapshot() {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const stage = `dist/snapshots/${day}`;
    const out = `dist/snapshots/${day}.car`;

    console.log(`📦 Creating daily snapshot: ${day}`);

    // Create staging directory
    fs.mkdirSync(stage, { recursive: true });

    // Copy dist directory (contains trust.json, metrics.json, badges, etc.)
    if (fs.existsSync("dist")) {
      fs.cpSync("dist", `${stage}/dist`, { recursive: true });
      console.log("✅ Copied dist/ directory");
    }

    // Copy daily status
    fs.mkdirSync(`${stage}/docs/status`, { recursive: true });
    if (fs.existsSync("docs/status/daily.md")) {
      fs.copyFileSync("docs/status/daily.md", `${stage}/docs/status/daily.md`);
      console.log("✅ Copied docs/status/daily.md");
    }

    // Copy recent receipts
    if (fs.existsSync("receipts")) {
      fs.cpSync("receipts", `${stage}/receipts`, { recursive: true });
      console.log("✅ Copied receipts/");
    }

    // Copy seed counts and patterns
    if (fs.existsSync("out/sweep-final")) {
      fs.mkdirSync(`${stage}/seeds`, { recursive: true });
      const seedFiles = fs.readdirSync("out/sweep-final")
        .filter(f => f.endsWith('.json'));

      // Sample seeds for manifest (not full copy to save space)
      const sampleSeeds = seedFiles.slice(0, 5);
      for (const file of sampleSeeds) {
        fs.copyFileSync(`out/sweep-final/${file}`, `${stage}/seeds/${file}`);
      }
      console.log(`✅ Copied ${sampleSeeds.length} sample seeds`);
    }

    // Create manifest
    const manifest = {
      kind: "pl/snapshot@v1",
      date: day,
      timestamp: new Date().toISOString(),
      includes: [
        "dist/**",
        "docs/status/daily.md",
        "receipts/**",
        "seeds/**"
      ],
      git: {
        rev: require('child_process').execSync("git rev-parse HEAD").toString().trim(),
        branch: require('child_process').execSync("git rev-parse --abbrev-ref HEAD").toString().trim()
      }
    };

    fs.writeFileSync(`${stage}/MANIFEST.json`, JSON.stringify(manifest, null, 2));
    console.log("✅ Created MANIFEST.json");

    // Create CAR file using existing IPLD tooling
    try {
      execFileSync("node", ["tools/ipld-export.ts", stage, out], {
        stdio: "inherit",
        cwd: process.cwd()
      });
    } catch (e) {
      // Fallback to simple tar if IPLD tooling not available
      console.warn("⚠️ IPLD export failed, using tar fallback");
      execFileSync("tar", ["-czf", `${out}.tar.gz`, "-C", stage, "."], {
        stdio: "inherit"
      });
      console.log(`📦 Fallback snapshot: ${out}.tar.gz`);
      return;
    }

    console.log(`📦 CAR snapshot created: ${out}`);

    // Clean up staging directory
    fs.rmSync(stage, { recursive: true });
    console.log("🧹 Cleaned up staging directory");

  } catch (error) {
    console.error("❌ Failed to create snapshot:", error.message);
    process.exit(1);
  }
}

makeSnapshot();