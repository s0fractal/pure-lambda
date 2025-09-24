#!/usr/bin/env bash
set -euo pipefail

echo "[1/2] Running unit tests (node --test)"
node --test tests/ipld_linker.test.mjs

echo "[2/2] Demo: buildGraph on sample tiles (A -> B)"
node -e '
  import("./scripts/ipld_linker.mjs").then(({buildGraph})=>{
    const tiles = [
      { iid: "A", neighborIIDs: { out: "B" } },
      { iid: "B" }
    ];
    const index = buildGraph(tiles);
    console.log(JSON.stringify(index, null, 2));
  });
'

echo "Smoke OK"
