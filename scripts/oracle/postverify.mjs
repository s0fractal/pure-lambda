#!/usr/bin/env node
// Post-EXPAND verification - checks metrics after expansion and triggers rollback if needed
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function readJson(p, def = null) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return def; }
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

console.log("🔍 POST-EXPAND VERIFICATION");
console.log("=" .repeat(40));

// Find the most recent expand decision
const opsHistory = readJson("reports/autonomy/ops.json", []);
const recentExpands = opsHistory
  .filter(op => op.kind === "oracle/expand-lite" && op.applied === true)
  .sort((a, b) => new Date(b.ts) - new Date(a.ts));

if (recentExpands.length === 0) {
  console.log("ℹ️ No recent EXPAND operations found");
  process.exit(0);
}

const lastExpand = recentExpands[0];
const expandTime = Date.parse(lastExpand.ts);
const now = Date.now();
const elapsed = now - expandTime;

// Wait at least 2 cycles (30min) for metrics to stabilize
const MIN_OBSERVATION = 30 * 60 * 1000;
if (elapsed < MIN_OBSERVATION) {
  const remaining = Math.ceil((MIN_OBSERVATION - elapsed) / 60000);
  console.log(`⏳ Waiting for observation period (${remaining}min remaining)`);
  process.exit(0);
}

console.log(`\n📊 Checking EXPAND from ${lastExpand.ts}`);
console.log(`   Delta applied: +${(lastExpand.delta * 100).toFixed(1)}%`);
console.log(`   Time elapsed: ${Math.round(elapsed / 60000)}min`);

// Get baseline metrics from expansion decision
const baseline = lastExpand.inputs || {};
console.log("\n📈 Baseline metrics:");
console.log(`   Trust: ${baseline.trust}%`);
console.log(`   DSSE: ${baseline.dsse}%`);
console.log(`   Burn: ${baseline.burn}x`);
console.log(`   TTQ: ${baseline.ttq || 0}s`);
console.log(`   Dedupe: ${baseline.dedupe}/24h`);

// Get current metrics
const dashboard = readJson("reports/dashboard/latest.json", {});
const current = {
  trust: dashboard.trust?.score ?? dashboard.metrics?.trust ?? 0,
  dsse: dashboard.dsse?.coverage ?? dashboard.metrics?.dsse ?? 0,
  burn: dashboard.burn?.breath_1h ?? dashboard.metrics?.burn ?? 0,
  ttq: dashboard.defense?.ttq ?? 0,
  dedupe: dashboard.dedupe?.blocks24h ?? dashboard.quality?.dedupeBlocks24h ?? 0,
  regret: dashboard.regret?.avg ?? 100,
  lbest: dashboard.lbest?.value ?? 0
};

console.log("\n📊 Current metrics:");
console.log(`   Trust: ${current.trust}% (Δ ${(current.trust - baseline.trust).toFixed(1)})`);
console.log(`   DSSE: ${current.dsse}% (Δ ${(current.dsse - baseline.dsse).toFixed(1)})`);
console.log(`   Burn: ${current.burn}x (Δ ${(current.burn - baseline.burn).toFixed(2)})`);
console.log(`   TTQ: ${current.ttq}s`);
console.log(`   Dedupe: ${current.dedupe}/24h`);
console.log(`   Regret: ${current.regret}%`);

// Success criteria
const criteria = {
  lbest_stable: current.lbest >= (baseline.lbest || 0), // Not worse
  regret_ok: current.regret <= 3,
  burn_ok: current.burn <= 1.5,
  ttq_ok: current.ttq <= 30,
  dedupe_ok: current.dedupe <= 1,
  trust_stable: current.trust >= baseline.trust - 1, // Allow 1% variance
  dsse_stable: current.dsse >= baseline.dsse
};

console.log("\n✅ Success criteria:");
for (const [key, passed] of Object.entries(criteria)) {
  console.log(`   ${key}: ${passed ? "✅" : "❌"}`);
}

const allPassed = Object.values(criteria).every(v => v);

if (allPassed) {
  console.log("\n✅ POST-EXPAND VERIFICATION PASSED");
  console.log("   Expansion confirmed successful");

  // Log success
  const receipt = {
    kind: "oracle/postverify-success",
    ts: new Date().toISOString(),
    expandRef: lastExpand.ts,
    delta: lastExpand.delta,
    observationTime: elapsed,
    baseline,
    current,
    criteria
  };

  const ops = readJson("reports/autonomy/ops.json", []);
  ops.push(receipt);
  writeJson("reports/autonomy/ops.json", ops);

} else {
  console.log("\n⚠️ POST-EXPAND VERIFICATION FAILED");
  console.log("   Triggering rollback...");

  // Calculate rollback amount
  const rollbackDelta = -lastExpand.delta;

  // Create rollback receipt
  const receipt = {
    kind: "oracle/postverify-rollback",
    ts: new Date().toISOString(),
    expandRef: lastExpand.ts,
    rollbackDelta,
    observationTime: elapsed,
    baseline,
    current,
    criteria,
    failedChecks: Object.entries(criteria).filter(([, v]) => !v).map(([k]) => k)
  };

  // Log to ops history
  const ops = readJson("reports/autonomy/ops.json", []);
  ops.push(receipt);
  writeJson("reports/autonomy/ops.json", ops);

  // Apply rollback
  if (process.env.DRY_RUN === "1") {
    console.log(`\n[DRY] Would apply rollback: ${(rollbackDelta * 100).toFixed(1)}%`);
  } else {
    const patch = { bandit: { epsDelta: rollbackDelta } };

    console.log(`\n🔄 Applying rollback: ${(rollbackDelta * 100).toFixed(1)}%`);
    const planCmd = spawnSync("node", ["scripts/oracle/plan.mjs"], {
      input: JSON.stringify(patch),
      encoding: "utf8"
    });

    if (planCmd.status === 0) {
      const applyCmd = spawnSync("node", ["scripts/oracle/apply.mjs"], {
        encoding: "utf8"
      });

      if (applyCmd.status === 0) {
        console.log("✅ Rollback applied successfully");
      } else {
        console.error("❌ Rollback apply failed");
        process.exit(1);
      }
    } else {
      console.error("❌ Rollback plan failed");
      process.exit(1);
    }
  }

  process.exit(1);
}