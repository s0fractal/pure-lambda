#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

import fs from "node:fs"; import path from "node:path";

const CFG = JSON.parse(fs.readFileSync(process.env.BIO_CFG ?? "{}", "utf8") || "{}");
const policy = fs.existsSync("policies/bio.yaml") ? fs.readFileSync("policies/bio.yaml","utf8") : "";
const deny = [/dual_use/i,/wetlab/i,/threat/i,/env_cascade/i,/delivery_opt/i];
const sigs = [
  /\b(step|protocol|dose|recipe|incub|culture|optimiz|enhanc)\b/i,
  /\b(lab|biosafety|BSL|threat|viral|bacterial|fungal)\b/i,
  /\b(aerosol|vector|plasmid|CRISPR|PCR)\b/i
];

const args = process.argv.slice(2);
const files = args.length ? args : fs.readdirSync(".", {withFileTypes:true})
  .flatMap(d=> d.isFile() ? [d.name] : []);

const hits = [];
for (const f of files) {
  if (!/\.(md|txt|yaml|yml|json|ts|js)$/i.test(f)) continue;
  const t = fs.readFileSync(f, "utf8");
  const m = sigs.some(rx=>rx.test(t));
  if (m) hits.push({file:f});
}

if (hits.length) {
  const refusal = {
    kind: "ProofOfAbstention",
    reason: "BIOLOCK: tx_only mode",
    hits, ts: new Date().toISOString()
  };
  fs.mkdirSync(".pl/refusals", {recursive:true});
  fs.writeFileSync(".pl/refusals/last.json", JSON.stringify(refusal,null,2));
  console.error("BIOLOCK: suspicion detected. Silence engaged.");
  process.exitCode = 2; // фейлим джоб/гейт
} else {
  console.log("BIOLOCK: clean (tx_only).");
}
