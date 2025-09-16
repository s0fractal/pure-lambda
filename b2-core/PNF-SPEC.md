# Pair-Normal Form (PNF) Specification

## Core Principle
**2-phash Law**: Any B2 composition reduces to a sequence of pairs (≤2 imports per operation).

## Definition
A B2 graph is in **Pair-Normal Form (PNF)** if:
1. Each operation imports at most 2 external atoms
2. Complex compositions are flattened to THEN chains of pairs
3. Redundant identity operations are eliminated

## Normal Form Rules

### Rule 1: Identity Elimination
```
THEN(id, f) → f
THEN(f, id) → f
```

### Rule 2: Split-Merge Simplification
```
SPLIT ▶ MERGE(id, id) → id
SPLIT ▶ MERGE(f, id) → f
SPLIT ▶ MERGE(id, g) → g
```

### Rule 3: Focus Composition
```
FOCUS ▶ FOCUS → FOCUS'  (combined filter+map)
SCAN ▶ id → SCAN
```

### Rule 4: Pair Decomposition
```
THEN(THEN(a,b), c) → THEN(a, THEN(b,c))  (right-associative)
Complex(a,b,c,d) → THEN(Pair(a,b), Pair(c,d))  (max 2 per pair)
```

## Verification Algorithm

1. **Import Count**: Ensure ≤2 external atoms per operation
2. **Pair Reduction**: Decompose complex operations to pairs
3. **Identity Pruning**: Remove redundant id operations
4. **phash Stability**: Verify fold→expand→fold invariant

## Acceptance Criteria
- phash preserved through normalization
- 0 misroutes on 30 DOE scenarios
- Confluence ratio C̄ ≥ 90%
- Route cost L reduced by ≥3%

## Examples

**Before PNF:**
```json
{
  "op": "THEN",
  "left": {"op": "THEN", "left": "FOCUS", "right": "id"},
  "right": {"op": "THEN", "left": "SCAN", "right": "id"}
}
```

**After PNF:**
```json
{
  "op": "THEN",
  "left": "FOCUS",
  "right": "SCAN"
}
```

**phash invariant**: `ph_abc123...` → `ph_abc123...` ✅