import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, canonicalize } from '../scripts/ipld_linker.mjs';

test('graph index canonical regardless of tile order', () => {
  const tiles1 = [
    { iid: 'B', neighborIIDs: { out: 'C' } },
    { iid: 'A', neighborIIDs: { out: 'B' } },
    { iid: 'C' }
  ];
  const tiles2 = [
    { iid: 'C' },
    { iid: 'A', neighborIIDs: { out: 'B' } },
    { iid: 'B', neighborIIDs: { out: 'C' } }
  ];
  const a = canonicalize(buildGraph(tiles1));
  const b = canonicalize(buildGraph(tiles2));
  assert.equal(a, b, 'canonical index must be identical');
});

