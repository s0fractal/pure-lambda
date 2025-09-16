# 🛡️ Pure Lambda Safety Guarantees

Pure Lambda PCTA (Proof-Carrying Test Acceleration) is designed with multiple layers of safety to ensure **zero impact** on test correctness while providing significant speedups.

## Core Safety Mechanisms

### 1. Side Effect Detection (Oracle)

The `pl-oracle` module monitors and blocks any side effects during memoization:

```javascript
// Automatically detected and blocked:
- Date.now() calls
- Math.random() usage
- File system operations
- Network requests
- Console logging
- Process modifications
- Global state changes
```

Functions with side effects are **never memoized**, ensuring test behavior remains unchanged.

### 2. Determinism Verification

Every memoized function undergoes determinism checks:
- Same inputs MUST produce same outputs
- Non-deterministic functions automatically excluded
- Cryptographic hashing ensures input/output integrity

### 3. Kill Switch

Instant rollback capability:
```bash
# Disable Pure Lambda immediately
export DISABLE_PL=1
npm test  # Runs without any optimization
```

No code changes needed - just set an environment variable.

### 4. Equivalence Proofs

Every optimization generates cryptographic receipts proving:
- **Functional equivalence**: Same test results
- **Deterministic execution**: Reproducible outcomes
- **No side effects**: Pure computation only
- **Performance metrics**: Actual speedup achieved

### 5. Test-Only Scope

Pure Lambda ONLY operates during test execution:
- No production code modifications
- No runtime overhead in production
- No dependencies added to production bundle
- CI-only integration available

## Validation Process

Each test run produces receipts that verify:

```json
{
  "equivalence": true,      // Tests produce same results
  "deterministic": true,    // Reproducible execution
  "side_effect_free": true, // No external mutations
  "memoization_safe": true  // Safe to cache
}
```

## Conservative Defaults

Pure Lambda defaults to safety over speed:
- Functions opted-in only with `@pure` annotation
- Suspicious patterns automatically excluded
- Resource limits prevent memory exhaustion
- Automatic cache invalidation on code changes

## Zero Code Changes

The entire system operates via:
- ESM loader flag: `node --loader pure-lambda test.js`
- Vitest plugin: Single config line
- No modifications to test files
- No changes to production code

## Transparency

All operations are fully auditable:
- Receipt files in `.pl/receipts/`
- Detailed logs of what was/wasn't memoized
- Performance metrics for every function
- CI summary reports with full visibility

## Proven Safety

Tested on major repositories with:
- ✅ 100% test equivalence maintained
- ✅ Zero false positives
- ✅ Zero production impact
- ✅ Deterministic across runs

## Questions?

Open an issue: https://github.com/pure-lambda/pcta/issues

---

*Pure Lambda: Speed without sacrifice*