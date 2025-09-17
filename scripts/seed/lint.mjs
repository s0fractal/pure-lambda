#!/usr/bin/env node
// Легкий seed-лінтер.
import fs from "fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/seed/lint.mjs <seed.json>");
  process.exit(2);
}

const s = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];

const PATTERNS = new Set([
  "select-focus",
  "bounded-delay",
  "route-audit",
  "partition-rr",
  "scan-metrics",
  "split-then-select",
  "delay-scan-antihysteresis",
  "merge-proof",
  "split-metric-select",
  "delay-scan-smoother",
  "merge-proof-lite",
  "bounded-partition",
  "select-tee"
]);

if (typeof s.name !== "string" || s.name.length === 0 || s.name.length > 64) {
  errors.push("name invalid");
}

if (!PATTERNS.has(s.pattern)) {
  errors.push("pattern invalid");
}

if (typeof s.params !== "object") {
  errors.push("params invalid");
}

if (s.version !== "1") {
  errors.push("version must be '1'");
}

const size = Buffer.byteLength(JSON.stringify(s));
if (size > 80 * 1024) {
  errors.push("seed > 80KB");
}

if (errors.length) {
  console.error("SEED LINT FAILED:", errors);
  process.exit(1);
}

console.log("seed ok:", file);