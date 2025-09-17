<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2025 Pure Lambda Authors -->

# Pure Lambda Conformance Testing

This document describes the conformance test suite for Pure Lambda, which validates the correctness of core algorithms and invariants across the system.

## Overview

The conformance test suite consists of three main test families that validate:

1. **GID/IID/XID Invariance** - Ensures hash-based identifiers maintain their mathematical properties
2. **Normal Form (NF) Rules** - Validates rewrite rule performance constraints and correctness
3. **Autopilot Regret Analysis** - Tests route selection optimality and regret bounds

## Test Families

### 1. GID/IID/XID Invariance Tests

These tests validate the three core identifier types used throughout Pure Lambda:

#### Global ID (GID) - Code Identity Invariants
- **Whitespace Invariance**: `x => x + 1` and `x=>x+1` must have identical GIDs
- **Alpha Renaming**: `foo => foo * 2` and `bar => bar * 2` must have identical GIDs
- **Parentheses Normalization**: `(x) => (x + 1)` and `x => x + 1` must have identical GIDs
- **Combined Normalization**: Tests complex combinations of whitespace, renaming, and syntax normalization

**What This Proves**: The PNF-LITE (Pair Normal Form Lite) algorithm correctly normalizes semantically equivalent code to the same canonical representation, enabling reliable code deduplication and caching.

#### Interface ID (IID) - ABI Compatibility Invariants
- **ABI Preservation**: Different code with identical type signatures and effects must have identical IIDs
- **Port Equivalence**: Different port orderings with same names/types must have identical IIDs
- **Effect Stability**: Functions with identical effect annotations must have identical IIDs
- **Fallback Handling**: Proper fallback from ABI to ports when ABI is missing

**What This Proves**: The Interface ID system correctly identifies tiles that are interchangeable from a type and effect perspective, enabling safe substitution and optimization.

#### Context ID (XID) - Neighbor Dependency Invariants
- **Neighbor Sensitivity**: XID must change when any neighbor IID changes
- **Port Subset Handling**: XID correctly handles cases where only some ports have neighbors
- **Empty Neighbor Handling**: Proper handling of tiles with no neighbors (uses empty marker `ø`)
- **Ordering Independence**: Neighbor IID order should not affect XID (deterministic serialization)

**What This Proves**: The Context ID system correctly captures the execution context dependencies, enabling precise invalidation when the computational graph changes.

#### Negative Test Cases
- **Semantic Changes**: Different code logic must produce different GIDs
- **Type Incompatibility**: Different types/effects must produce different IIDs
- **Context Independence**: Identical contexts must not accidentally differ

### 2. Normal Form (NF) Rule Tests

These tests validate the three core rewrite rules used for graph optimization:

#### THEN(id,f) → f (Identity Elimination)
Tests removal of identity operations from sequential compositions.

**Examples**:
- `THEN(IDENTITY, MAP)` → `MAP`
- `THEN(IDENTITY, FILTER)` → `FILTER`

**Constraints Validated**:
- Hops: ≤ -1 (removes at least one operation)
- Latency: ≤ 0 (never increases execution time)
- Memory: ≤ 0 (never increases memory usage)
- L(best) does not degrade

**What This Proves**: Identity elimination reduces computational overhead without changing semantics or degrading performance.

#### SPLIT▶MERGE(id,id) → id (Redundant Branch Elimination)
Tests elimination of split-merge patterns where both branches are identical.

**Examples**:
- `SPLIT → [IDENTITY, IDENTITY] → MERGE` → `IDENTITY`
- `SPLIT → [same_operation, same_operation] → MERGE` → `same_operation`

**Constraints Validated**:
- Hops: ≤ -2 (removes split and merge operations)
- Latency: ≤ -2 (eliminates branching overhead)
- Memory: ≤ -1 (reduces parallel memory usage)
- L(best) does not degrade

**What This Proves**: Redundant parallelization is correctly detected and eliminated, reducing complexity without losing performance.

#### FOCUS∘FOCUS → FOCUS' (Focus Composition)
Tests composition of consecutive focus operations into a single optimized focus.

**Examples**:
- `FOCUS(lens1) → FOCUS(lens2)` → `FOCUS(lens1 ∘ lens2)`
- Chain of multiple FOCUS operations → Single composed FOCUS

**Constraints Validated**:
- Hops: ≤ -1 (reduces operation count)
- Latency: ≤ -1 (eliminates intermediate steps)
- Memory: = 0 (composition doesn't change memory profile)
- L(best) does not degrade
- **Code Generation**: May be disabled for exponential-cost operations (marked as stubs)

**What This Proves**: Focus composition reduces pipeline depth while maintaining correctness, with intelligent handling of performance-critical cases.

### 3. Autopilot Regret Analysis Tests

These tests validate the route selection algorithm's optimality guarantees:

#### Unique Minimum (regret = 0)
Tests scenarios with a single clearly optimal route.

**Examples**:
- Simple identity operation vs. expensive computation
- Fast path vs. slow algorithmic alternatives
- Memory-efficient vs. memory-heavy approaches

**What This Proves**: The autopilot correctly identifies the unique optimal solution when one exists.

#### Ties (regret ≈ 0, typically < 1%)
Tests scenarios with multiple equivalent optimal routes.

**Examples**:
- Different algorithms with identical complexity
- Parallel paths with equivalent cost profiles
- Memory vs. latency tradeoffs with balanced outcomes

**What This Proves**: The autopilot correctly identifies when multiple routes are essentially equivalent and doesn't artificially prefer one over another.

#### Near Ties (regret/L* ≤ 3%)
Tests scenarios where routes are nearly optimal but have small differences.

**Examples**:
- 99% efficiency alternatives to optimal routes
- Routes with minor overhead differences
- Memory-constrained vs. compute-constrained alternatives

**What This Proves**: The autopilot's regret bounds are tight and it can distinguish between truly optimal and nearly-optimal solutions.

## Running the Tests

### Prerequisites
- Node.js with TypeScript support (ts-node)
- All Pure Lambda tools built and available:
  - `tools/gid.ts` - GID/IID/XID calculator
  - `tools/nf.ts` - Normal form rewriter
  - `tools/autopilot.ts` - Route selection engine

### Basic Usage

```bash
# Run all conformance tests
node tests/conformance-run.mjs

# This will create:
# - reports/conformance/junit.xml (JUnit format)
# - reports/conformance/tap.txt (TAP13 format)
# - reports/conformance/summary.md (Human-readable summary)
```

### Understanding Output

#### Exit Codes
- **0**: All tests passed - system conformance verified
- **1**: One or more tests failed - investigate reports for details

#### Report Formats

**JUnit XML** (`junit.xml`): Machine-readable format for CI/CD integration
```xml
<testsuites>
  <testsuite name="gid_iid_xid" tests="24" failures="0" time="1.234">
    <testcase name="gid_whitespace_invariance_1" classname="gid_iid_xid" time="0.056"/>
    <!-- ... -->
  </testsuite>
</testsuites>
```

**TAP13** (`tap.txt`): Standard test anything protocol format
```
TAP version 13
1..48
ok 1 - gid_iid_xid:gid_whitespace_invariance_1
ok 2 - gid_iid_xid:gid_whitespace_invariance_2
not ok 3 - gid_iid_xid:negative_gid_code_change # Expected failure confirmed
```

**Summary Markdown** (`summary.md`): Human-readable detailed breakdown with:
- Overall pass/fail statistics
- Per-family performance metrics
- Individual test results with timing
- Explanations of what each test family validates

## Interpreting Failures

### GID/IID/XID Failures
- **GID Mismatch**: PNF-LITE normalization issue - check alpha-renaming or whitespace handling
- **IID Mismatch**: ABI canonicalization problem - verify type/effect/port serialization
- **XID Mismatch**: Context dependency issue - check neighbor IID handling

### NF Rule Failures
- **Constraint Violation**: Rule violates performance guarantees (hops/latency/memory)
- **L(best) Degradation**: Optimization made performance worse - check L-function calculation
- **Rule Not Applied**: Pattern matching or constraint checking failed

### Autopilot Failures
- **Regret Bound Exceeded**: Route selection not optimal enough - check L-function weights
- **No Routes Found**: Graph traversal issue - verify operon structure
- **Wrong Regret Classification**: Misclassified unique/tie/near-tie scenario

## Test Vector Structure

### GID/IID/XID Vectors
```jsonl
{
  "name": "test_name",
  "tileYaml": "op: FOCUS\\ncode: \\"x => x + 1\\"",
  "mutations": [{"type": "whitespace", "code": "x  =>  x  +  1"}],
  "expect": {"gidEqual": [[0,1]], "iidEqual": [], "xidDiff": [], "fail": false}
}
```

### NF Vectors
```jsonl
{
  "name": "test_name",
  "operonJson": {"nodes": {...}, "root": "node_id"},
  "expect": {
    "rule": "THEN_IDENTITY",
    "deltaConstraints": {"hops": -1, "latency": -1, "memory": 0},
    "lNotWorse": true,
    "enabled": true
  }
}
```

### Autopilot Vectors
```jsonl
{
  "name": "test_name",
  "operonJson": {"nodes": {...}, "root": "node_id"},
  "expect": {
    "regretType": "unique_minimum",
    "regretBound": 0,
    "lStarExpected": 1.2
  }
}
```

## Coverage Statistics

The test suite provides:
- **24 GID/IID/XID tests**: 6 GID invariance, 6 IID equality, 6 XID sensitivity, 6 negative controls
- **12 NF rule tests**: 4 per rule type (THEN_IDENTITY, SPLIT_MERGE_IDENTITY, FOCUS_COMPOSE)
- **12 Autopilot tests**: 4 unique minima, 4 ties, 4 near-ties

Total: **48 conformance tests** covering core Pure Lambda algorithms and invariants.

## Extension Points

To add new test vectors:

1. **Add JSONL entries** to the appropriate `tests/vectors/*/vectors.jsonl` file
2. **Follow the schema** shown above for your test family
3. **Run tests** to verify your additions work correctly
4. **Update documentation** if adding new test categories

The conformance framework is designed to be extensible - new test families can be added by creating new vector files and extending the test runner.