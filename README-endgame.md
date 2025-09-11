# λ - Pure Lambda

**One lambda that digests everything.**

```bash
./λ one <repo|dir|zip>
```

Input → λ-IR → Proofs → WASM, one command.

## What it does

Takes any codebase and:
1. Digests to pure lambda calculus IR
2. Proves mathematical laws hold
3. Optimizes with 5 essential rules
4. Outputs a WASM body with soul

## Core

- `kernel/core/` - λ-IR, normalize, soul computation
- `kernel/rules/` - map_fusion, fold_sink, focus, early_stop, clone_elim
- `kernel/verify/` - 5 laws: identity, fusion, round-trip, length-preserved, monotone
- `forge/wasm/` - WASM body assembly

## Endgame v0.1

- **Size**: < 1.2MB
- **Speedup**: > 10x
- **Distortion**: < 0.1
- **Soul**: Preserved through all transformations

That's it. Everything else is noise.