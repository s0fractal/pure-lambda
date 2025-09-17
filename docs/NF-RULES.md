<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2025 Pure Lambda Authors -->

# NF Rules: Normal Form Transformations

**Version:** 1.0
**Last Updated:** 2025-09-16
**Status:** Operational

## Overview

The NF (Normal Form) system provides safe, semantics-preserving graph transformations that optimize pure-lambda operons by eliminating redundant operations and composing equivalent structures. These transformations maintain behavioral equivalence while improving performance characteristics.

## The Three NF Rules

### 1. THEN Identity Elimination

**Rule:** `THEN(id,f) → f`

**Description:** Removes identity composition in THEN operations where the left operand is an identity function.

**Pattern:**
```javascript
// Before
THEN(IDENTITY, function_f)

// After
function_f
```

**Delta Guarantees:**
- Hops: -1 (one less execution step)
- Latency: -1 (reduced execution time)
- Memory: 0 (no memory change)

**Example:**
```json
{
  "before": {
    "op": "THEN",
    "left": { "op": "IDENTITY" },
    "right": { "op": "FOCUS", "code": "x => x.field" }
  },
  "after": {
    "op": "FOCUS",
    "code": "x => x.field"
  }
}
```

### 2. Split-Merge Identity Elimination

**Rule:** `SPLIT▶MERGE(id,id) → id`

**Description:** Eliminates redundant split-merge operations where both branches are identical identity operations.

**Pattern:**
```javascript
// Before
SPLIT(data) ▶ [IDENTITY, IDENTITY] ▶ MERGE

// After
IDENTITY
```

**Delta Guarantees:**
- Hops: -2 (eliminates two operations)
- Latency: -2 (significant latency reduction)
- Memory: -1 (frees intermediate storage)

**Example:**
```json
{
  "before": {
    "split": { "op": "SPLIT", "branches": ["a", "b"] },
    "merge": {
      "op": "MERGE",
      "left": "identity(a)",
      "right": "identity(b)"
    }
  },
  "after": {
    "op": "IDENTITY"
  }
}
```

### 3. Focus Composition

**Rule:** `FOCUS∘FOCUS → FOCUS'`

**Description:** Composes two consecutive FOCUS operations into a single optimized FOCUS operation.

**Pattern:**
```javascript
// Before
FOCUS(obj => obj.field1) ∘ FOCUS(field1 => field1.field2)

// After
FOCUS(obj => obj.field1.field2)  // with new GID via PNF-LITE
```

**Delta Guarantees:**
- Hops: -1 (one less focus operation)
- Latency: -1 (eliminates intermediate access)
- Memory: 0 (same memory footprint)

**Example:**
```json
{
  "before": [
    { "op": "FOCUS", "path": "data" },
    { "op": "FOCUS", "path": "field" }
  ],
  "after": {
    "op": "FOCUS",
    "path": "data.field",
    "gid": "newly_generated_via_pnf_lite"
  }
}
```

## Safety Constraints

### Global Constraints

The NF system only operates under these strict conditions:

1. **Breath Governor**: Must NOT be in expand mode (κ ≥ 0)
2. **Purity Required**: All affected tiles must be pure (no side effects)
3. **Law Compatibility**: Transformations must preserve mathematical laws
4. **Semantic Preservation**: Operon behavior must remain identical

### When NOT to Apply

**Critical: NF transformations are BLOCKED when:**

- **κ < 0**: Breath governor is in expand mode (system is under stress)
- **Effects Present**: Any tile has side effects in its ABI
- **Law Mismatch**: Mathematical laws are incompatible
- **Non-Pure Operations**: I/O, async effects, mutations detected
- **Type Mismatches**: Strong typing constraints violated

### Rule-Specific Constraints

#### THEN Identity
- Left operand must be pure identity function
- Right operand must be pure
- No effects in either operand's ABI

#### Split-Merge Identity
- Both branches must be identical
- All operations in the pattern must be pure
- No intermediate effects between split and merge

#### Focus Composition
- Both FOCUS operations must be pure
- Must be directly consecutive (no intermediate operations)
- Composable field access paths

## Guarantees

### Patch Map & Receipts

Every NF transformation provides:

1. **Complete Patch Map**: Detailed before/after state for every changed node
2. **Delta Receipt**: Exact performance improvements (hops, latency, memory)
3. **Reversion Capability**: Ability to undo transformations via `.orig.json` backups
4. **Traceability**: Full audit trail of what was changed and why

### Behavioral Invariance

**Guarantee:** The operon's input→output behavior remains identical after transformation.

**Verification:**
- Route-level output phash remains stable
- Same evaluation trace ID on identical inputs
- Receipt validation passes
- Causality preservation verified

### Performance Improvements

**Cumulative Deltas:** Multiple NF rule applications compound:
- Consecutive FOCUS compositions: Each saves 1 hop + 1 latency
- Split-merge eliminations: Each saves 2 hops + 2 latency + 1 memory
- THEN identity removals: Each saves 1 hop + 1 latency

## Implementation Details

### GID Updates

When FOCUS composition occurs:
1. **PNF-LITE** generates new GID for composed operation
2. **Syntactic Wrap** method preserves source semantics
3. **Source Maps** maintained for debugging

### Backup & Recovery

Every `--mode=apply` operation:
1. Creates `.orig.json` backup before transformation
2. Generates patch map with timestamps
3. Enables rollback via patch inversion

## FAQ

### Will GID Change?

**Answer:** Tile GIDs may change during transformations (especially FOCUS composition), but operon behavior must not change. This is verified through:
- Receipt validation
- Route-level output phash stability
- L(best) cost function non-increase

### How to Revert Changes?

```bash
# If you have the .orig.json backup
cp operon.orig.json operon.json

# Or use patch inversion (future feature)
nf-revert operon.patch.json
```

### Performance Impact?

NF transformations always improve or maintain performance:
- **Never increase** L(best) cost function
- **Always reduce** or maintain hop counts
- **Memory usage** only decreases or stays same

### Can I Trust the Transformations?

Yes, due to multiple safety layers:
1. **Constraint validation** before any changes
2. **Semantic preservation** verification
3. **Rollback capability** via backups
4. **Automated testing** via DOE suite

### What About Concurrent Modifications?

NF operates on static snapshots. If the operon changes during transformation:
- Transformation is abandoned
- Original state is preserved
- User is notified of conflicts

### Integration with Autopilot?

NF transformations are compatible with autopilot:
- Autopilot can trigger NF passes
- NF never interferes with autopilot's cost optimization
- Both systems respect the same purity constraints

## Usage Examples

### Basic Dry Run
```bash
ts-node tools/nf.ts operon.json --mode=dry --out operon.nf.json --patch operon.patch.json
```

### Apply Transformations
```bash
ts-node tools/nf.ts operon.json --mode=apply --out operon.nf.json --patch operon.patch.json
# Creates operon.orig.json backup automatically
```

### Run DOE Test Suite
```bash
node scripts/nf-doe-run.mjs fixtures/nf-doe.json
# Validates all 18 transformation cases
```

## Error Handling

### Common Errors

**"No transformations applied"**
- Check if κ ≥ 0 (breath governor state)
- Verify tiles are pure (no effects in ABI)
- Ensure pattern matching conditions are met

**"Constraint violation"**
- Review law compatibility
- Check for side effects
- Validate type constraints

**"Patch generation failed"**
- Verify input JSON structure
- Check file permissions
- Ensure disk space available

## Related Documentation

- [Breath Governor](./BREATH-GOVERNOR.md) - System stress management
- [Pure Lambda Semantics](./PURE-LAMBDA.md) - Functional programming model
- [Operon Structure](./OPERONS.md) - Graph organization
- [Receipt System](./RECEIPTS.md) - Verification and audit trails

---

*The NF system is a core component of the pure-lambda architecture, providing safe optimizations that maintain semantic correctness while improving performance. All transformations are reversible and thoroughly tested.*