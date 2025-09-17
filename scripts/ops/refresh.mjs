#!/usr/bin/env node
// One-shot metrics refresh - updates dashboard/trust/dedupe/coverage
import { spawnSync } from "child_process";

const run = (cmd, args) => {
  try {
    const r = spawnSync(cmd, args, { stdio: "inherit" });
    return r.status === 0;
  } catch {
    return false;
  }
};

console.log("🔄 Refreshing dashboard/trust/dedupe/coverage...");
console.log("");

// Update scoreboard (trust & DSSE)
console.log("📊 Updating scoreboard...");
run("node", ["scripts/scoreboard/update.mjs"]) || console.log("  ⚠️ skip scoreboard");

// Update trust metrics
console.log("🔐 Updating trust...");
run("node", ["scripts/fed/trust.mjs", "--write"]) || console.log("  ⚠️ skip trust");

// Update dedupe quality
console.log("🔍 Updating dedupe...");
run("node", ["scripts/quality/dedupe.mjs", "--write"]) || console.log("  ⚠️ skip dedupe");

// Update pattern coverage
console.log("🌍 Updating coverage...");
run("node", ["scripts/coverage/update.mjs", "--write"]) || console.log("  ⚠️ skip coverage");

// Update dashboard
console.log("📈 Updating dashboard...");
run("node", ["scripts/monitor/dashboard.mjs"]) || console.log("  ⚠️ skip dashboard");

// Update autonomy status
console.log("🤖 Updating autonomy...");
run("node", ["scripts/dashboard/autonomy.mjs"]) || console.log("  ⚠️ skip autonomy");

console.log("");
console.log("✅ Metrics refresh complete");