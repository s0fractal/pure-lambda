#!/usr/bin/env node
import fs from "fs";
import path from "path";

const seedsDir = "seeds/garden";
const outDir = "docs/showcase";
fs.mkdirSync(outDir, { recursive: true });

function safeRead(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

const list = [];
if (fs.existsSync(seedsDir)) {
  for (const f of fs.readdirSync(seedsDir).filter(x => x.endsWith(".json"))) {
    const s = safeRead(path.join(seedsDir, f));
    if (!s) continue;

    list.push({
      name: s.name ?? f.replace(/\.json$/, ""),
      pattern: s.pattern ?? "unknown",
      xidv2: s.xidv2 ?? s.xid ?? null,
      novelty: s.metadata?.novelty ?? s.meta?.novelty ?? null,
      size: Buffer.byteLength(JSON.stringify(s)),
      author: s.author?.name ?? s.author?.did ?? "anonymous"
    });
  }
}

const data = {
  generatedAt: new Date().toISOString(),
  total: list.length,
  items: list.sort((a, b) => (b.novelty ?? 0) - (a.novelty ?? 0))
};

fs.writeFileSync(path.join(outDir, "data.json"), JSON.stringify(data, null, 2));
console.log(`showcase data: ${data.total} seeds -> docs/showcase/data.json`);