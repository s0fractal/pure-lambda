# GENOME@v1 Specification

## Core Atoms (6)

| Atom | phash | Type | Semantics |
|------|-------|------|-----------|
| `id` | `ph_1d00...` | `a → a` | Identity |
| `FOCUS` | `ph_f0c5...` | `a → Option b` | Filter + map |
| `SCAN` | `ph_5ca4...` | `(s,a) → (s',Option b)` | Stateful accumulator |
| `DELAY` | `ph_de1a...` | `a_t → a_{t-1}` | Unit delay (z⁻¹) |
| `MERGE` | `ph_me63...` | `(Option a)² → Option a` | Left-biased union |
| `PAIR` | `ph_pa12...` | `(a,b) → (a,b)` | Pair constructor |

## Surface Combinators (2)

| Combinator | Symbol | phash | Type |
|------------|--------|-------|------|
| `THEN` | `▶` | `ph_7he4...` | Sequential composition |
| `SPLIT` | `∆` | `ph_5p17...` | Parallel fork |

## Fundamental Laws

1. **THEN associative**: `(f ▶ g) ▶ h = f ▶ (g ▶ h)`
2. **THEN non-commutative**: `f ▶ g ≠ g ▶ f`
3. **SPLIT coassociative**: Preserves input without side effects
4. **SCAN causal**: Output_t depends only on (State_{t-1}, Input_t)
5. **DELAY requirement**: Every cycle contains ≥1 DELAY
6. **MERGE monoid**: (None = identity, ⊕ = left-biased)

## Compilation

```
B2 Graph → Canonical Form → phash = BLAKE3("pl/genome-v1" || CBOR)
```

## Verification

- All λ are unary
- ≤2 external imports per module
- No algebraic loops
- Gate G0 compliance

---

*6 atoms. 2 combinators. ∞ evolution. This is the genome.*