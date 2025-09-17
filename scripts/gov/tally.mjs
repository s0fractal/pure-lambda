#!/usr/bin/env node
// Підрахунок DSSE-підписаних бюлетенів (спрощений): перевірка DID та дедуплікація.
import fs from "fs";

const didsPath = "registry/dids.json";
if (!fs.existsSync(didsPath)) {
  // Create empty DIDs registry if not exists
  fs.mkdirSync("registry", { recursive: true });
  fs.writeFileSync(didsPath, JSON.stringify([
    { id: "did:example:alice", expires: "2026-01-01" },
    { id: "did:example:bob", expires: "2026-01-01" },
    { id: "did:example:charlie", expires: "2026-01-01" }
  ], null, 2));
}

const dids = JSON.parse(fs.readFileSync(didsPath, "utf8"));
const ballotsDir = "receipts/ballots";

if (!fs.existsSync(ballotsDir)) {
  console.log("no ballots");
  fs.mkdirSync("dist/gov", { recursive: true });
  fs.writeFileSync("dist/gov/state.json", JSON.stringify({
    approved: false,
    voters: [],
    counts: 0,
    ts: new Date().toISOString()
  }, null, 2));
  process.exit(0);
}

const now = Date.now();
const valid = [];

for (const f of fs.readdirSync(ballotsDir).filter(x => x.endsWith(".json"))) {
  const b = JSON.parse(fs.readFileSync(`${ballotsDir}/${f}`, "utf8"));
  const did = b?.voter?.did;
  const rec = dids.find(x => x.id === did);

  if (!rec) continue;

  const exp = new Date(rec.expires).getTime();
  if (isNaN(exp) || exp < now) continue;

  valid.push({ did, proposal: b.proposal, ts: b.ts });
}

const uniq = new Map();
valid.forEach(v => {
  uniq.set(v.did, v);
});

const govTxt = fs.readFileSync("policies/governance.toml", "utf8");
const thr = parseInt((govTxt.match(/threshold\s*=\s*(\d+)/) || [])[1] || "2", 10);
const approved = uniq.size >= thr;

const out = {
  approved,
  voters: [...uniq.keys()],
  counts: uniq.size,
  ts: new Date().toISOString()
};

fs.mkdirSync("dist/gov", { recursive: true });
fs.writeFileSync("dist/gov/state.json", JSON.stringify(out, null, 2));
console.log("governance:", out);