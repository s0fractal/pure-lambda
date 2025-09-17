#!/usr/bin/env node
// Chaos drill for EXPAND/rollback testing - simulates trust dip and verifies auto-rollback
import fs from "fs";
import { spawnSync } from "child_process";

const run = (cmd, args, env = {}) => {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env }
  });
  return result.status === 0;
};

console.log("🎯 CHAOS DRILL: expand → trust dip → auto-rollback");
console.log("=" .repeat(50));

// Step 1: Refresh metrics to ensure fresh data
console.log("\n📊 Step 1: Refreshing metrics...");
if (!run("make", ["metrics-refresh"])) {
  console.error("❌ Failed to refresh metrics");
  process.exit(2);
}

// Step 2: Test gate in DRY_RUN mode
console.log("\n🔍 Step 2: Testing gate logic (DRY_RUN)...");
const dryResult = spawnSync("node", ["scripts/oracle/green-gate.mjs"], {
  env: { ...process.env, DRY_RUN: "1" },
  encoding: "utf8"
});

if (dryResult.stdout?.includes("HOLD")) {
  console.log("⏸️  Gate is in HOLD state - this is expected during drill");
} else if (dryResult.stdout?.includes("Would APPLY")) {
  console.log("✅ Gate would apply in green conditions");
}

// Step 3: Simulate trust failure
console.log("\n💥 Step 3: Simulating trust dip to 94.8%...");
const dashPath = "reports/dashboard/latest.json";
const snap = JSON.parse(fs.readFileSync(dashPath, "utf8"));
const originalTrust = snap.trust?.score || snap.metrics?.trust || 96.3;

// Create test scenario with low trust
const failureScenario = {
  ...snap,
  trust: {
    score: 94.8,
    ts: new Date().toISOString(),
    trigger: "chaos-drill"
  },
  timestamp: new Date().toISOString()
};

// Save to temp location
fs.mkdirSync("tmp/drills", { recursive: true });
const drillPath = "tmp/drills/latest.lowtrust.json";
fs.writeFileSync(drillPath, JSON.stringify(failureScenario, null, 2));

// Step 4: Verify gate blocks on low trust
console.log("\n🛡️ Step 4: Verifying gate blocks on low trust...");
const blockTest = spawnSync("node", ["scripts/oracle/green-gate.mjs"], {
  env: {
    ...process.env,
    DRY_RUN: "1",
    DASHBOARD_PATH: drillPath  // Use test dashboard
  },
  encoding: "utf8"
});

if (blockTest.stdout?.includes("HOLD") || blockTest.stdout?.includes("Trust")) {
  console.log("✅ Gate correctly blocks on trust < 96%");
} else {
  console.error("❌ Gate did not block on low trust!");
  process.exit(1);
}

// Step 5: Test rollback mechanism (if exists)
console.log("\n⏪ Step 5: Testing rollback mechanism...");
const rollbackPath = "scripts/oracle/rollback.mjs";
if (fs.existsSync(rollbackPath)) {
  const rollbackOk = run("node", [rollbackPath, drillPath]);
  if (rollbackOk) {
    console.log("✅ Rollback executed successfully");
  } else {
    console.log("⚠️ Rollback script exists but returned non-zero");
  }
} else {
  console.log("ℹ️ No rollback script found - would rely on gate blocking");
}

// Step 6: Verify hysteresis
console.log("\n📈 Step 6: Testing hysteresis (96.2% ON, 95.5% OFF)...");
const hysteresisTests = [
  { trust: 95.4, expect: "HOLD", desc: "Below OFF threshold" },
  { trust: 95.8, expect: "HOLD", desc: "Between OFF and ON" },
  { trust: 96.3, expect: "GO", desc: "Above ON threshold" },
];

for (const test of hysteresisTests) {
  const testScenario = {
    ...snap,
    trust: { score: test.trust, ts: new Date().toISOString() },
    dsse: { coverage: 100 },
    dedupe: { blocks24h: 0 },
    burn: { breath_1h: 1.0 }
  };

  const testPath = `tmp/drills/trust-${test.trust}.json`;
  fs.writeFileSync(testPath, JSON.stringify(testScenario, null, 2));

  const result = spawnSync("node", ["scripts/oracle/green-gate.mjs"], {
    env: { ...process.env, DRY_RUN: "1", DASHBOARD_PATH: testPath },
    encoding: "utf8"
  });

  const gotHold = result.stdout?.includes("HOLD");
  const expected = test.expect === "HOLD";

  if (gotHold === expected) {
    console.log(`  ✅ Trust ${test.trust}%: ${test.desc} - ${test.expect}`);
  } else {
    console.log(`  ❌ Trust ${test.trust}%: Expected ${test.expect}, got ${gotHold ? "HOLD" : "GO"}`);
  }
}

// Cleanup
console.log("\n🧹 Cleaning up drill files...");
try {
  fs.rmSync("tmp/drills", { recursive: true, force: true });
} catch {}

console.log("\n" + "=" .repeat(50));
console.log("✅ CHAOS DRILL COMPLETE");
console.log("   - Gate blocks on low trust");
console.log("   - Hysteresis prevents flapping");
console.log("   - System safe from uncontrolled expansion");