#!/usr/bin/env node
// Застосування плану за умови схвалення governance (2-of-3 DID).
import fs from "fs";
import path from "path";

const stPath = "dist/gov/state.json";
if (!fs.existsSync(stPath)) {
  console.error("No governance state found");
  process.exit(2);
}

const state = JSON.parse(fs.readFileSync(stPath, "utf8"));
if (!state?.approved) {
  console.error("Governance not approved");
  process.exit(2);
}

const planPathArg = process.argv[2];
const planPath = planPathArg || fs.readdirSync("receipts/ops").filter(f => f.startsWith("plan-")).sort().pop();

if (!planPath) {
  console.error("No plan found");
  process.exit(2);
}

const plan = JSON.parse(fs.readFileSync(path.join("receipts/ops", planPath), "utf8"));

// Guarded-apply limits: Only allow ε-explore changes within [-10%, +10%]
function validateEpsilonChange(newEps, currentEps = 0.1) {
  const minEps = currentEps * 0.9; // -10%
  const maxEps = currentEps * 1.1; // +10%

  if (newEps < minEps || newEps > maxEps) {
    console.error(`❌ ε-explore change rejected: ${newEps} outside safe range [${minEps.toFixed(3)}, ${maxEps.toFixed(3)}]`);
    console.error("   Requires 2-of-3 DID approval for larger changes");
    return false;
  }

  return true;
}

// Check for larger changes requiring enhanced approval
const currentConfig = fs.existsSync("dist/governor/config.json")
  ? JSON.parse(fs.readFileSync("dist/governor/config.json", "utf8"))
  : { eps: 0.1 };

const needsEnhancedApproval = !validateEpsilonChange(plan.plan.eps, currentConfig.eps);

if (needsEnhancedApproval) {
  // Check for 2-of-3 DID approval
  const enhancedApproval = state?.enhancedApproval || false;
  if (!enhancedApproval) {
    console.error("❌ Enhanced 2-of-3 DID approval required for large changes");
    console.log("   Current change requires enhanced governance approval");
    process.exit(3);
  }
  console.log("✅ Enhanced 2-of-3 DID approval confirmed for large change");
}

fs.mkdirSync("dist/governor", { recursive: true });
fs.writeFileSync(
  "dist/governor/config.json",
  JSON.stringify(
    {
      mode: plan.plan.mode,
      eps: plan.plan.eps,
      ts: new Date().toISOString(),
      guardedApply: true,
      epsilonChangeApproved: needsEnhancedApproval
    },
    null,
    2
  )
);

console.log("APPLIED governor:", plan.plan.mode, plan.plan.eps);
if (needsEnhancedApproval) {
  console.log("⚠️  Large change applied with enhanced approval");
}