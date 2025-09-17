#!/usr/bin/env node
// Canary EXPAND - gradual expansion with observation periods
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const CANARY_STEPS = [
  { delta: 0.01, waitCycles: 2, desc: "canary +1%" },
  { delta: 0.02, waitCycles: 1, desc: "follow-up +2%" }
];

const statePath = "state/canary-expand.json";
const metricsPath = "reports/dashboard/latest.json";
const opsPath = "reports/autonomy/ops.json";

function readJson(p, def = null) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return def; }
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

// Check if we're in canary mode
const CANARY = process.env.EXPAND_MODE === "canary";
const DRY = process.env.DRY_RUN === "1";

if (!CANARY) {
  console.log("ℹ️ Not in canary mode - use EXPAND_MODE=canary to enable");
  process.exit(0);
}

console.log("🐤 CANARY EXPAND MODE");
console.log("=" .repeat(40));

// Load canary state
const state = readJson(statePath, {
  step: 0,
  startedAt: null,
  lastApply: null,
  baselineMetrics: null,
  appliedDeltas: []
});

const now = Date.now();

// Load current metrics
const metrics = readJson(metricsPath, {});
const currentMetrics = {
  trust: metrics.trust?.score ?? metrics.metrics?.trust ?? 0,
  dsse: metrics.dsse?.coverage ?? metrics.metrics?.dsse ?? 0,
  burn: metrics.burn?.breath_1h ?? metrics.metrics?.burn ?? 0,
  ttq: metrics.defense?.ttq ?? 0,
  dedupe: metrics.dedupe?.blocks24h ?? metrics.quality?.dedupeBlocks24h ?? 0,
  regret: metrics.regret?.avg ?? 100,
  timestamp: metrics.timestamp
};

// Initialize baseline on first run
if (!state.baselineMetrics) {
  console.log("📊 Capturing baseline metrics...");
  state.baselineMetrics = currentMetrics;
  state.startedAt = now;
  writeJson(statePath, state);
}

// Check if we're still in observation period
if (state.lastApply) {
  const cycleTime = 15 * 60 * 1000; // 15min per cycle
  const currentStep = CANARY_STEPS[state.step];
  const waitTime = currentStep.waitCycles * cycleTime;
  const elapsed = now - state.lastApply;

  if (elapsed < waitTime) {
    const remaining = Math.ceil((waitTime - elapsed) / 60000);
    console.log(`⏳ Observation period: ${remaining}min remaining`);
    console.log(`   Step ${state.step + 1}/${CANARY_STEPS.length}: ${currentStep.desc}`);

    // Check metrics during observation
    const degraded =
      currentMetrics.burn > state.baselineMetrics.burn * 1.5 ||
      currentMetrics.ttq > 30 ||
      currentMetrics.dedupe > 1 ||
      currentMetrics.regret > state.baselineMetrics.regret * 1.2;

    if (degraded) {
      console.log("⚠️ Metrics degradation detected during observation!");
      console.log(`   Burn: ${currentMetrics.burn}x (baseline: ${state.baselineMetrics.burn}x)`);
      console.log(`   TTQ: ${currentMetrics.ttq}s`);
      console.log(`   Dedupe: ${currentMetrics.dedupe}/24h`);
      console.log(`   Regret: ${currentMetrics.regret}%`);

      if (!DRY) {
        console.log("🔄 Triggering rollback...");
        // Rollback by negative sum of applied deltas
        const rollbackDelta = -state.appliedDeltas.reduce((sum, d) => sum + d, 0);
        const rollbackPatch = { bandit: { epsDelta: rollbackDelta } };

        const receipt = {
          kind: "oracle/canary-rollback",
          ts: new Date().toISOString(),
          reason: "metrics degradation in observation",
          rollbackDelta,
          metrics: currentMetrics,
          baseline: state.baselineMetrics
        };

        // Log to ops history
        const ops = readJson(opsPath, []);
        ops.push(receipt);
        writeJson(opsPath, ops);

        // Apply rollback
        const cmd = spawnSync("node", ["scripts/oracle/plan.mjs"], {
          input: JSON.stringify(rollbackPatch),
          encoding: "utf8"
        });

        if (cmd.status === 0) {
          spawnSync("node", ["scripts/oracle/apply.mjs"]);
          console.log("✅ Rollback applied");
        }

        // Reset canary state
        fs.unlinkSync(statePath);
      } else {
        console.log("[DRY] Would trigger rollback");
      }

      process.exit(1);
    }

    console.log("✅ Metrics stable during observation");
    process.exit(0);
  }
}

// Check if all steps completed
if (state.step >= CANARY_STEPS.length) {
  console.log("✅ Canary expansion complete!");
  console.log(`   Total applied: +${(state.appliedDeltas.reduce((s, d) => s + d, 0) * 100).toFixed(1)}%`);

  // Create success receipt
  const receipt = {
    kind: "oracle/canary-success",
    ts: new Date().toISOString(),
    totalDelta: state.appliedDeltas.reduce((s, d) => s + d, 0),
    steps: state.step,
    duration: now - state.startedAt,
    finalMetrics: currentMetrics,
    baseline: state.baselineMetrics
  };

  const ops = readJson(opsPath, []);
  ops.push(receipt);
  writeJson(opsPath, ops);

  // Clean up state
  if (!DRY) {
    fs.unlinkSync(statePath);
  }
  process.exit(0);
}

// Apply next canary step
const nextStep = CANARY_STEPS[state.step];
console.log(`\n📈 Applying canary step ${state.step + 1}/${CANARY_STEPS.length}`);
console.log(`   Delta: +${(nextStep.delta * 100).toFixed(1)}%`);
console.log(`   Observation: ${nextStep.waitCycles} cycles (~${nextStep.waitCycles * 15}min)`);

if (DRY) {
  console.log("\n🔬 DRY RUN - would apply:");
  console.log(`   Patch: ${JSON.stringify({ bandit: { epsDelta: nextStep.delta } })}`);
  process.exit(0);
}

// Apply the delta
const patch = { bandit: { epsDelta: nextStep.delta } };
const planCmd = spawnSync("node", ["scripts/oracle/plan.mjs"], {
  input: JSON.stringify(patch),
  encoding: "utf8"
});

if (planCmd.status !== 0) {
  console.error("❌ Plan generation failed");
  process.exit(1);
}

const applyCmd = spawnSync("node", ["scripts/oracle/apply.mjs"], {
  encoding: "utf8"
});

if (applyCmd.status !== 0) {
  console.error("❌ Apply failed");
  process.exit(1);
}

// Update canary state
state.step++;
state.lastApply = now;
state.appliedDeltas.push(nextStep.delta);
writeJson(statePath, state);

console.log("\n✅ Canary step applied");
console.log(`   Next check in: ${nextStep.waitCycles * 15}min`);
console.log(`   Total so far: +${(state.appliedDeltas.reduce((s, d) => s + d, 0) * 100).toFixed(1)}%`);