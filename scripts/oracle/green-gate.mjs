#!/usr/bin/env node
// Smart gate for safe EXPAND - auto-applies only when all conditions are green
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const dashPath = "reports/dashboard/latest.json";
const statePath = "state/eps-applied.json";
const patch = { bandit: { epsDelta: +0.03 } };   // +3% per click
const MAX_ABS = 0.10;                             // ±10% total limit

function readJson(p, def = null) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return def; }
}

// Read current metrics
const d = readJson(dashPath, {});
const patterns = d.coverage?.patterns ?? 0;
const cov12 = patterns === "12/12" || (d.coverage?.percentage ?? 0) === 100;
const trust = d.trust?.score ?? 0;
const dsse  = d.dsse?.coverage ?? 0;
const burn  = d.burn?.breath_1h ?? 9;
const dedupe = d.dedupe?.blocks24h ?? 99;
const loa   = readJson("reports/dashboard/latest.json.autonomy", {}).loa ?? 0;

// Safety conditions
const healthy = (trust >= 96) && (dsse === 100) && (dedupe <= 1) && (burn < 2) && cov12 && (loa === 2);

console.log("🔍 Green Gate Check");
console.log(`   Coverage 12/12: ${cov12 ? "✅" : "❌"}`);
console.log(`   Trust ≥96%: ${trust >= 96 ? "✅" : "❌"} (${trust}%)`);
console.log(`   DSSE 100%: ${dsse === 100 ? "✅" : "❌"} (${dsse}%)`);
console.log(`   Dedupe ≤1: ${dedupe <= 1 ? "✅" : "❌"} (${dedupe})`);
console.log(`   Burn <2x: ${burn < 2 ? "✅" : "❌"} (${burn}x)`);
console.log(`   LoA =2: ${loa === 2 ? "✅" : "❌"} (${loa})`);

if (!healthy) {
  console.log("⏸️  HOLD: Gate not green - waiting for all conditions");
  process.exit(0);
}

// Check cumulative limit (±10%)
const st = readJson(statePath, { epsApplied: 0 });
const next = st.epsApplied + patch.bandit.epsDelta;

console.log(`\n📊 Epsilon tracking:`);
console.log(`   Current total: ${(st.epsApplied * 100).toFixed(1)}%`);
console.log(`   After apply: ${(next * 100).toFixed(1)}%`);
console.log(`   Limit: ±10%`);

if (Math.abs(next) > MAX_ABS) {
  console.log("⏸️  HOLD: Epsilon limit reached (±10% max)");
  process.exit(0);
}

// Generate plan
console.log("\n🔮 Generating Oracle plan...");
const planCmd = spawnSync("node", ["scripts/oracle/plan.mjs"], {
  input: JSON.stringify(patch),
  encoding: "utf8"
});

if (planCmd.status !== 0) {
  console.error("❌ Plan generation failed:", planCmd.stderr);
  process.exit(planCmd.status);
}

// Apply plan (with governance check)
console.log("✅ Applying plan with governance check...");
const applyCmd = spawnSync("node", ["scripts/oracle/apply.mjs"], {
  encoding: "utf8"
});

if (applyCmd.status !== 0) {
  console.error("❌ Apply failed:", applyCmd.stderr);
  process.exit(applyCmd.status);
}

// Update state counter
fs.mkdirSync(path.dirname(statePath), { recursive: true });
fs.writeFileSync(statePath, JSON.stringify({
  epsApplied: next,
  lastApply: new Date().toISOString(),
  appliedCount: (st.appliedCount || 0) + 1
}, null, 2));

console.log("\n✅ EXPAND-LITE APPLIED: +3% epsilon (guarded)");
console.log(`   Total epsilon: ${(next * 100).toFixed(1)}%`);
console.log(`   Remaining capacity: ${((MAX_ABS - Math.abs(next)) * 100).toFixed(1)}%`);