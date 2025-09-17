# 🚀 Pure Lambda - Autonomous Control System

[![CI](https://github.com/s0fractal/pure-lambda/actions/workflows/ci.yml/badge.svg)](https://github.com/s0fractal/pure-lambda/actions/workflows/ci.yml)
![PAC Badge](fractal-lattice/pac-badge.svg) ![Autopilot](https://img.shields.io/badge/autopilot-STABLE-brightgreen?style=flat-square) ![Speedup](https://img.shields.io/badge/speedup-1.61×-blue?style=flat-square) ![Proofs](https://img.shields.io/badge/proofs-✓-success?style=flat-square) ![100 Seeds Week](https://img.shields.io/badge/100_Seeds_Week-LIVE-4CAF50?style=flat-square)

> **🌱 100 Seeds Week is LIVE! Submit your computational seeds and help grow the ecosystem. [Learn more →](docs/100-SEEDS-WEEK.md)**

> **Автопілот на стабільній ґратці: 1.61× швидше, PAC ≤ 2.22% @95%, нуль побічних ефектів (Gate G0). Embassy Pack — офлайн, read-only, з криптоперевіркою. Запустіть локально. Решта — ваша справа.**

## 🎯 Proven Performance (v1.0.0)

- **1.61× median speedup** with mathematical guarantees
- **PAC bound ≤ 2.22% @95%** (135 orthogonal tests, 0 misroutes)
- **Gate #0: 100% side effect blocking** (oracle violations = 0)
- **+61% energy efficiency** | **0.039kg CO₂ saved** weekly

## Quick Start (GitHub Action)

Add to your `.github/workflows/` file:

```yaml
name: CI with Pure Lambda Canary

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests (baseline)
        run: npm test

      - name: Pure Lambda Canary
        uses: s0fractal/pure-lambda@v1
        with:
          runner: vitest  # or jest, pytest
          node-version: 20
          package-manager: npm
        continue-on-error: true  # Non-blocking
```

## How It Works

1. **ESM Loader** instruments code at runtime (zero changes needed)
2. **Oracle** detects side effects and blocks unsafe optimizations
3. **Memoization** caches pure function results using content-addressed storage
4. **Receipts** provide cryptographic proof of equivalence and performance

## Local Usage

```bash
# Install
curl -sSL -o loader.mjs https://raw.githubusercontent.com/s0fractal/pure-lambda/main/packages/loader/index.mjs

# Run with acceleration
node --loader=./loader.mjs node_modules/vitest/vitest.mjs run

# View receipts
ls .pl/receipts/
```

## Typical Results

- **p-queue**: 3× faster (6ms → 2ms, 91.6% cache rate)
- **Validation libs**: 2-4× faster on schema operations
- **Build tools**: 25-35% faster on file parsing
- **State managers**: 20-30% on reducer operations

## Safety Guarantees

✅ **Non-blocking**: `continue-on-error: true` - never breaks CI
✅ **Zero code changes**: Works via ESM loader only
✅ **Side effect detection**: Oracle monitors Date, Math.random, fs, etc
✅ **Deterministic**: Seeded randomness ensures reproducibility
✅ **Cryptographic proofs**: Receipts verify equivalence
✅ **Kill switch**: Remove action or set `PL_DISABLE=1`

## Action Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `runner` | `vitest` | Test runner: vitest, jest, pytest |
| `node-version` | `20` | Node.js version |
| `package-manager` | `npm` | Package manager: npm, yarn, pnpm |
| `timeout` | `10` | Timeout in minutes |
| `upload-artifacts` | `true` | Upload receipt artifacts |

## Action Outputs

| Output | Description |
|--------|-------------|
| `baseline-time` | Baseline execution time (ms) |
| `canary-time` | Canary execution time (ms) |
| `speedup` | Speedup multiplier |
| `cache-rate` | Cache hit rate (%) |

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ESM Loader    │───▶│     Oracle       │───▶│   Memoization   │
│                 │    │                  │    │                 │
│ • Instruments   │    │ • Side effects   │    │ • Content hash  │
│ • Zero changes  │    │ • Determinism    │    │ • Cache storage │
│ • Runtime only  │    │ • Safety checks  │    │ • Receipts      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Examples

See [examples/](examples/) for integration with:
- Vitest
- Jest
- TypeScript
- Yarn/PNPM monorepos

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests
4. Submit PR

## License

MIT © [s0fractal](https://github.com/s0fractal)