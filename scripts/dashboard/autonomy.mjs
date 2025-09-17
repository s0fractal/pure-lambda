#!/usr/bin/env node
import fs from "fs";
import path from "path";

const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const outDir = "reports/dashboard";
fs.mkdirSync(outDir, { recursive: true });

let loA = 0, why = [];

function g(p, d = null) {
  try {
    return rd(p);
  } catch {
    return d;
  }
}

// Вхідні метрики агрегації:
const latest = g(path.join(outDir, "latest.json"), {});
const trust = latest?.trust?.current ?? 0;
const dsse = latest?.dsse?.current ?? 0;
const breath = latest?.burn?.breath_1h ?? 1;
const ttq = latest?.defense?.ttq ?? 9999;
const burn = latest?.burn?.breath_1h ?? 0;
const regret = latest?.autopilot?.regretAvg ?? 100;

// LoA логіка (див. docs/AUTONOMY.md):
if (trust >= 95 && dsse === 100) {
  loA = 2;
}
if (loA >= 2 && breath <= 2 && ttq <= 120) {
  loA = 2;
}
if (loA === 2 && burn <= 2 && regret <= 3) {
  loA = 3;
}

if (dsse < 100) why.push("dsse<100");
if (trust < 95) why.push("trust<95");

const res = {
  loa: loA,
  why,
  snapshot: { trust, dsse, breath, ttq, burn, regret },
  ts: new Date().toISOString()
};

fs.writeFileSync(
  path.join(outDir, "latest.json.autonomy"),
  JSON.stringify(res, null, 2)
);

console.log(`LoA=${loA}`, res);