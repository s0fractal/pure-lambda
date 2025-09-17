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

fs.mkdirSync("dist/governor", { recursive: true });
fs.writeFileSync(
  "dist/governor/config.json",
  JSON.stringify(
    {
      mode: plan.plan.mode,
      eps: plan.plan.eps,
      ts: new Date().toISOString()
    },
    null,
    2
  )
);

console.log("APPLIED governor:", plan.plan.mode, plan.plan.eps);