#!/usr/bin/env node
// Пропонує дії (без застосування): режим, eps, guardrails, пояснення.
import fs from "fs";
import path from "path";
import crypto from "crypto";

const dash = JSON.parse(fs.readFileSync("reports/dashboard/latest.json", "utf8"));
const auto = JSON.parse(fs.readFileSync("reports/dashboard/latest.json.autonomy", "utf8"));
const outDir = "receipts/ops";
fs.mkdirSync(outDir, { recursive: true });

function decide(d, a) {
  const trust = d?.trust?.current ?? 0;
  const dsse = d?.dsse?.current ?? 0;
  const nov = d?.novelty?.median ?? 0;
  const breath = d?.burn?.breath_1h ?? 1;
  const burn = d?.burn?.breath_1h ?? 9;
  const dedupe = (d?.dedupe?.flagged ?? 0) - (d?.dedupe?.confirmed ?? 0);

  let mode = "STABLE", eps = 0.07;

  if (trust >= 96 && dsse === 100 && nov >= 0.36 && breath <= 1 && dedupe <= 1 && a.loa >= 2) {
    mode = "EXPAND";
    eps = 0.12;
  }
  if (trust < 95 || dsse < 100 || burn > 2 || (d?.defense?.ttq ?? 9999) > 60 || dedupe >= 2) {
    mode = "CONTRACT";
    eps = 0.03;
  }

  return {
    mode,
    eps,
    actions: [{ type: "governor.set", mode, eps }],
    reason: { trust, dsse, nov, breath, burn, dedupe, loa: a.loa }
  };
}

const plan = decide(dash, auto);
const payload = {
  kind: "oracle-plan",
  version: 1,
  plan,
  expected: { deltaL: -0.001, risk: "low" },
  guards: ["BIOLOCK", "SLO", "REDLANE"],
  ts: new Date().toISOString()
};

payload.subjectHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

const file = path.join(outDir, `plan-${payload.ts.replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(file, JSON.stringify(payload, null, 2));
console.log("PLAN:", file);