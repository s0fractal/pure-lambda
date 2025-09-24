#!/usr/bin/env node
// Minimal IPLD-style graph linker without external deps.
// Focus: deterministic node IDs and neighbor-based edges.

import { createHash } from 'crypto';

export function canonicalize(obj) {
  const sortKeys = (v) => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(sortKeys(obj));
}

export function sha256Hex(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

// tiles: Array<{ iid: string, op?: string, meta?: any, neighborIIDs?: Record<string,string> }>
export function buildGraph(tiles) {
  // 1) Deterministic node identifiers (CID-like labels)
  const nodes = tiles.map(t => {
    const body = { iid: t.iid, op: t.op || null, meta: t.meta || null };
    const hex = sha256Hex(canonicalize(body));
    return { iid: t.iid, cid: `mh:${hex}`, body };
  });

  // 2) IID -> CID map
  const iidToCid = new Map(nodes.map(n => [n.iid, n.cid]));

  // 3) Edges from neighborIIDs
  const edges = [];
  tiles.forEach(t => {
    const fromCid = iidToCid.get(t.iid);
    const neighbors = t.neighborIIDs || {};
    for (const port of Object.keys(neighbors).sort()) {
      const toIID = neighbors[port];
      const toCid = toIID ? iidToCid.get(toIID) : null;
      if (fromCid && toCid) edges.push({ from: fromCid, port, to: toCid });
    }
  });

  // 4) Deterministic index structure
  //    - nodes sorted by iid
  //    - edges sorted by (from,port,to)
  const sortedNodes = nodes
    .map(n => ({ iid: n.iid, cid: n.cid }))
    .sort((a, b) => a.iid.localeCompare(b.iid) || a.cid.localeCompare(b.cid));
  const sortedEdges = edges
    .slice()
    .sort((a, b) => (a.from.localeCompare(b.from) || a.port.localeCompare(b.port) || a.to.localeCompare(b.to)));

  const index = {
    v: 1,
    nodes: sortedNodes,
    edges: sortedEdges
  };
  return index;
}

// CLI utility: read tiles JSON from stdin and emit index JSON
if (import.meta.url === `file://${process.argv[1]}`) {
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const tiles = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const index = buildGraph(tiles);
      process.stdout.write(JSON.stringify(index, null, 2));
    } catch (e) {
      console.error('linker error:', e?.message || e);
      process.exit(1);
    }
  });
}
