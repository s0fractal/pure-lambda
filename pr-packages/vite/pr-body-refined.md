This PR adds an **optional CI target** that runs tests with a read-only ESM loader.
- ✅ Zero code changes / zero runtime changes (canary only)
- ✅ Cryptographic receipts: equivalence + determinism + side-effect oracle
- ✅ Typical speedup on test-heavy suites: 20–50%

**Matrix**
• baseline: `npm test`
• canary:   `node --loader=@pl/loader node_modules/vitest/vitest.mjs run`

**Artifacts**
• `.pl/receipts/*.json` (proofs, seed, cache stats)
• `interop/ci-report.md` (baseline vs canary timings, cache hit-rate)

Safety:
• canary job is `continue-on-error: true`
• network/fs/env side-effects are blocked or flagged; if detected, optimizations auto-disable
• one-flag rollback: remove the canary job

If this proves useful, we can keep it as a non-blocking target or expand gradually.