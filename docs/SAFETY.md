<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2025 Pure Lambda Authors -->

# 🛡️ Pure Lambda Safety Guarantees

Pure Lambda PCTA (Proof-Carrying Test Acceleration) is designed with multiple layers of safety to ensure **zero impact** on test correctness while providing significant speedups.

## 🔒 BIOLOCK Safety Architecture

Pure Lambda includes BIOLOCK, a comprehensive safety system that prevents generation or optimization of potentially harmful biological content. This is a **default-deny** system with a narrow therapeutic corridor for safe educational content.

### Four-Layer Defense System

1. **Semantic Classification (Lock A)**
   - Automatic content scanning for dual-use patterns
   - TX (therapeutics) vs DU (dual-use) classification
   - Immediate silence on suspicious content

2. **Capability Control (Lock B)**
   - No connection to wet-lab equipment/APIs
   - Multi-signature requirement for elevated permissions
   - Time-limited access tokens (TTL)

3. **Build Attestation (Lock C)**
   - All components must have signed receipts
   - Deterministic builds with phash verification
   - Unknown genes/code rejected by default

4. **Environment Isolation (Lock D)**
   - Digital Biosafety Levels (DL-0 to DL-2)
   - Default full isolation (no I/O)
   - Graduated access with multi-party approval

### TX Corridor (Allowed Content)

Safe patterns that remain accessible:
- General biology education (high-level concepts)
- Medical ethics discussions
- Regulatory and compliance information
- Privacy engineering methods
- Patient consent frameworks

### Illyrian Clause

For personal health improvements:
- Individual and voluntary only
- Must be reversible
- No heritable modifications
- No population-level effects
- Requires medical supervision (dual signatures)

### Proof of Abstention

When content is blocked, the system generates:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "action": "BLOCKED",
  "reason": "Dual-use biological content detected",
  "patterns_detected": ["protocol", "synthesis"],
  "policy": "policies/bio.yaml"
}
```

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