#!/usr/bin/env node
// LoA3 Promotion Controller - Safe promotion/demotion with full criteria checks
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const mode = process.argv[2]; // --check, --apply, --demote

function readJson(p, def = null) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return def; }
}

// Simple TOML parser/writer for our needs
function readToml(p) {
  try {
    const content = fs.readFileSync(p, "utf8");
    const result = {};
    let currentSection = null;

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        const sectionPath = trimmed.slice(1, -1);
        const parts = sectionPath.split(".");
        currentSection = result;
        for (const part of parts) {
          currentSection[part] = currentSection[part] || {};
          currentSection = currentSection[part];
        }
      } else if (trimmed.includes("=") && currentSection) {
        const [key, ...valueParts] = trimmed.split("=");
        let value = valueParts.join("=").trim();
        // Remove comments (anything after #)
        const commentIndex = value.indexOf("#");
        if (commentIndex !== -1) {
          value = value.substring(0, commentIndex).trim();
        }
        // Remove quotes and convert to number if possible
        value = value.replace(/"/g, "");
        const numValue = parseFloat(value);
        currentSection[key.trim()] = !isNaN(numValue) ? numValue : value;
      }
    }
    return result;
  } catch { return {}; }
}

function writeToml(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // For simplicity, just update the level and apply fields
  const content = fs.readFileSync(p, "utf8");
  let updated = content
    .replace(/^level = \d+/m, `level = ${data.current.level}`)
    .replace(/^apply = \w+/m, `apply = ${data.current.apply}`)
    .replace(/^mode = "\w+"/m, `mode = "${data.current.mode}"`);
  fs.writeFileSync(p, updated);
}

// Read current policy
const policyPath = "policies/autonomy.toml";
const policy = readToml(policyPath);

// Read metrics
const dashboard = readJson("reports/dashboard/latest.json", {});
const gate = readJson("reports/dashboard/gate.json", {});
const autonomy = readJson("reports/dashboard/latest.json.autonomy", {});
const opsHistory = readJson("reports/autonomy/ops.json", []);

// Calculate shadow hit rate
const shadowPath = "reports/autonomy/shadow.csv";
let shadowHitRate = 0;
let shadowSamples = 0;
if (fs.existsSync(shadowPath)) {
  const shadowData = fs.readFileSync(shadowPath, "utf8").trim().split("\n");
  shadowSamples = shadowData.length - 1; // Exclude header
  if (shadowData.length > 1) {
    const recent = shadowData.slice(-20); // Last 20 samples
    const matches = recent.filter(line => line.includes(",true,")).length;
    shadowHitRate = matches / recent.length;
  }
}

// Check canary success rate
const recentCanaries = opsHistory
  .filter(op => op.kind === "oracle/canary-success" || op.kind === "oracle/canary-rollback")
  .slice(-10); // Last 10 canary operations
const canarySuccess = recentCanaries.length > 0
  ? recentCanaries.filter(op => op.kind === "oracle/canary-success").length / recentCanaries.length
  : 0;

// Extract current metrics
const metrics = {
  shadow_hit_rate: shadowHitRate,
  regret_avg: dashboard.regret?.avg ?? 100,
  regret_p95: dashboard.regret?.p95 ?? 100,
  trust: dashboard.trust?.current ?? dashboard.trust?.score ?? dashboard.metrics?.trust ?? 0,
  dsse: dashboard.dsse?.current ?? dashboard.dsse?.coverage ?? dashboard.metrics?.dsse ?? 0,
  dedupe_blocks24h: dashboard.dedupe?.blocks24h ?? dashboard.decision?.guardrails?.dedupe_blocks ?? 99,
  burn_1h: dashboard.burn?.breath_1h ?? dashboard.decision?.guardrails?.breath_burn ?? 9,
  ttq_s: dashboard.defense?.ttq ?? 99,
  bio_incidents: dashboard.bio?.incidents ?? 0,
  staleness_minutes: Math.round((Date.now() - Date.parse(dashboard.timestamp || 0)) / 60000),
  canary_success_rate: canarySuccess,
  clock_anomaly: gate.reason?.includes("clock") ?? false,
  current_loa: autonomy.loa ?? policy.current?.level ?? 0
};

// Check promotion criteria
const promoteThresholds = policy.promote?.thresholds || {};
if (process.env.DEBUG) {
  console.log("DEBUG promoteThresholds:", JSON.stringify(promoteThresholds, null, 2));
  console.log("DEBUG metrics:", JSON.stringify(metrics, null, 2));
}
const promoteCriteria = {
  shadow_hit_rate: metrics.shadow_hit_rate >= (promoteThresholds.shadow_hit_rate ?? 0.85),
  regret_avg: metrics.regret_avg <= (promoteThresholds.regret_avg_max ?? 0.03) * 100,
  regret_p95: metrics.regret_p95 <= (promoteThresholds.regret_p95_max ?? 0.07) * 100,
  trust: metrics.trust >= (promoteThresholds.trust_min ?? 0.962) * 100,
  dsse: metrics.dsse >= (promoteThresholds.dsse_coverage ?? 1.0) * 100,
  dedupe: metrics.dedupe_blocks24h <= (promoteThresholds.dedupe_blocks24h_max ?? 1),
  burn: metrics.burn_1h <= (promoteThresholds.burn_1h_max ?? 1.5),
  ttq: metrics.ttq_s <= (promoteThresholds.ttq_s_max ?? 30),
  biolock: metrics.bio_incidents === (promoteThresholds.bio_incidents ?? 0),
  fresh: metrics.staleness_minutes <= (promoteThresholds.staleness_minutes_max ?? 30),
  canary: metrics.canary_success_rate >= (promoteThresholds.canary_success_rate ?? 0.9),
  clock: !metrics.clock_anomaly
};

// Check demotion triggers
const demoteTriggers = policy.demote?.triggers || {};
const demoteNeeded =
  metrics.trust < (demoteTriggers.trust_below ?? 0.955) * 100 ||
  metrics.dsse < (demoteTriggers.dsse_below ?? 1.0) * 100 ||
  metrics.burn_1h > (demoteTriggers.burn_over ?? 2.0) ||
  metrics.ttq_s > (demoteTriggers.ttq_over_s ?? 60) ||
  metrics.regret_avg > (demoteTriggers.regret_over ?? 0.05) * 100 ||
  metrics.bio_incidents > (demoteTriggers.incidents_over ?? 0) ||
  (demoteTriggers.clock_anomaly && metrics.clock_anomaly);

const allPromoteCriteriaMet = Object.values(promoteCriteria).every(v => v);

// Display function
function displayStatus() {
  console.log("🎯 LoA3 PROMOTION CHECK");
  console.log("=" .repeat(40));
  console.log(`Current LoA: ${metrics.current_loa}`);
  console.log(`Target LoA: 3`);
  console.log("");

  console.log("📊 METRICS:");
  console.log(`   Shadow Hit Rate: ${(metrics.shadow_hit_rate * 100).toFixed(1)}%`);
  console.log(`   Regret (avg/p95): ${metrics.regret_avg.toFixed(1)}% / ${metrics.regret_p95.toFixed(1)}%`);
  console.log(`   Trust: ${metrics.trust.toFixed(1)}%`);
  console.log(`   DSSE: ${metrics.dsse}%`);
  console.log(`   Dedupe: ${metrics.dedupe_blocks24h}/24h`);
  console.log(`   Burn: ${metrics.burn_1h.toFixed(2)}x`);
  console.log(`   TTQ: ${metrics.ttq_s}s`);
  console.log(`   BIOLOCK: ${metrics.bio_incidents} incidents`);
  console.log(`   Canary Success: ${(metrics.canary_success_rate * 100).toFixed(0)}%`);
  console.log(`   Metrics Age: ${metrics.staleness_minutes}min`);
  console.log("");

  console.log("✅ PROMOTION CRITERIA:");
  // Debug: log the actual promoteCriteria object
  if (process.env.DEBUG) {
    console.log("DEBUG promoteCriteria:", JSON.stringify(promoteCriteria, null, 2));
  }
  for (const [key, passed] of Object.entries(promoteCriteria)) {
    console.log(`   ${key}: ${passed ? "✅" : "❌"}`);
  }
  console.log("");

  if (demoteNeeded) {
    console.log("⚠️ DEMOTION TRIGGERS ACTIVE:");
    const triggers = [];
    if (metrics.trust < demoteTriggers.trust_below * 100) triggers.push("trust low");
    if (metrics.dsse < demoteTriggers.dsse_below * 100) triggers.push("DSSE incomplete");
    if (metrics.burn_1h > demoteTriggers.burn_over) triggers.push("burn high");
    if (metrics.ttq_s > demoteTriggers.ttq_over_s) triggers.push("TTQ high");
    if (metrics.regret_avg > demoteTriggers.regret_over * 100) triggers.push("regret high");
    triggers.forEach(t => console.log(`   - ${t}`));
    console.log("");
  }
}

// Main logic
if (mode === "--check") {
  displayStatus();

  if (allPromoteCriteriaMet && metrics.current_loa < 3) {
    console.log("🚀 READY FOR LoA3 PROMOTION");
    console.log("   Run: make loa3-promote");
  } else if (metrics.current_loa === 3 && demoteNeeded) {
    console.log("⚠️ DEMOTION NEEDED");
    console.log("   Run: make loa3-demote");
  } else if (metrics.current_loa === 3) {
    console.log("✅ LoA3 ACTIVE & HEALTHY");
  } else {
    console.log("⏳ NOT READY FOR PROMOTION");
    const missing = Object.entries(promoteCriteria)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    console.log(`   Missing: ${missing.join(", ")}`);
  }

  process.exit(allPromoteCriteriaMet ? 0 : 1);

} else if (mode === "--apply") {
  displayStatus();

  if (!allPromoteCriteriaMet) {
    console.error("❌ Cannot promote - criteria not met");
    process.exit(1);
  }

  if (metrics.current_loa >= 3) {
    console.log("ℹ️ Already at LoA3 or higher");
    process.exit(0);
  }

  // Update policy
  policy.current.level = 3;
  policy.current.apply = true;
  policy.current.mode = "guarded";
  policy.history = policy.history || {};
  policy.history.last_promotion = new Date().toISOString();
  policy.history.promotion_count = (policy.history.promotion_count || 0) + 1;
  policy.history.current_since = new Date().toISOString();

  writeToml(policyPath, policy);

  // Create promotion receipt
  const receipt = {
    kind: "autonomy/promotion",
    ts: new Date().toISOString(),
    from_loa: metrics.current_loa,
    to_loa: 3,
    metrics,
    criteria: promoteCriteria,
    evidence: {
      dashboard_hash: execSync(`sha256sum reports/dashboard/latest.json | cut -d' ' -f1`, { encoding: "utf8" }).trim(),
      policy_hash: execSync(`sha256sum ${policyPath} | cut -d' ' -f1`, { encoding: "utf8" }).trim(),
      canary_operations: recentCanaries.length,
      shadow_samples: shadowSamples
    }
  };

  const ops = readJson("reports/autonomy/ops.json", []);
  ops.push(receipt);
  fs.writeFileSync("reports/autonomy/ops.json", JSON.stringify(ops, null, 2));

  console.log("\n✅ PROMOTED TO LoA3");
  console.log("   Policy updated");
  console.log("   Receipt created");
  console.log("   Auto-apply ENABLED in guarded mode");

} else if (mode === "--demote") {
  displayStatus();

  if (metrics.current_loa < 3) {
    console.log("ℹ️ Not at LoA3 - nothing to demote");
    process.exit(0);
  }

  // Update policy
  policy.current.level = 2;
  policy.current.apply = false;
  policy.current.mode = "shadow";
  policy.history = policy.history || {};
  policy.history.last_demotion = new Date().toISOString();
  policy.history.demotion_count = (policy.history.demotion_count || 0) + 1;
  policy.history.current_since = new Date().toISOString();

  writeToml(policyPath, policy);

  // Create demotion receipt
  const receipt = {
    kind: "autonomy/demotion",
    ts: new Date().toISOString(),
    from_loa: metrics.current_loa,
    to_loa: 2,
    reason: demoteNeeded ? "triggers activated" : "manual",
    metrics,
    triggers: {
      trust_low: metrics.trust < demoteTriggers.trust_below * 100,
      dsse_incomplete: metrics.dsse < demoteTriggers.dsse_below * 100,
      burn_high: metrics.burn_1h > demoteTriggers.burn_over,
      ttq_high: metrics.ttq_s > demoteTriggers.ttq_over_s,
      regret_high: metrics.regret_avg > demoteTriggers.regret_over * 100,
      incidents: metrics.bio_incidents > demoteTriggers.incidents_over,
      clock: metrics.clock_anomaly
    }
  };

  const ops = readJson("reports/autonomy/ops.json", []);
  ops.push(receipt);
  fs.writeFileSync("reports/autonomy/ops.json", JSON.stringify(ops, null, 2));

  console.log("\n⬇️ DEMOTED TO LoA2");
  console.log("   Policy updated");
  console.log("   Receipt created");
  console.log("   Auto-apply DISABLED");

} else {
  console.log("Usage: node promote-loa3.mjs [--check|--apply|--demote]");
  process.exit(1);
}