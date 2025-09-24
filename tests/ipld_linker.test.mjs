import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, canonicalize, sha256Hex } from '../scripts/ipld_linker.mjs';

test('buildGraph connects neighbors by IID', () => {
  const tiles = [
    { iid: 'A', neighborIIDs: { out: 'B' } },
    { iid: 'B' }
  ];
  const index = buildGraph(tiles);
  assert.equal(Array.isArray(index.edges), true);
  assert.equal(index.edges.length, 1);
  const e = index.edges[0];
  const to = index.nodes.find(n => n.iid === 'B').cid;
  const from = index.nodes.find(n => n.iid === 'A').cid;
  assert.equal(e.to, to);
  assert.equal(e.from, from);
  assert.equal(e.port, 'out');
});

test('deterministic index snapshot', () => {
  const tiles = [
    { iid: 'A' },
    { iid: 'B' }
  ];
  const a = canonicalize(buildGraph(tiles));
  const b = canonicalize(buildGraph(tiles));
  assert.equal(a, b);
  assert.equal(sha256Hex(a), sha256Hex(b));
});

