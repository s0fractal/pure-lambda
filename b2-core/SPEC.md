# B2 Core Specification

## The Complete Fractal Algebra

**6 unary atoms + 2 binary combinators = ∞ compositions**

## Core Atoms (Unary λ)

```haskell
id      : a → a                           -- identity
FOCUS   : a → Option b                    -- filter + map
SCAN    : (s, a) → (s', Option b)        -- stateful accumulator
DELAY   : a_t → a_{t-1}                   -- unit delay (z⁻¹)
MERGE   : (Option a, Option a) → Option a -- left-biased union
PAIR    : (a, b) → (a, b)                 -- pair constructor
```

## Surface Combinators (Binary)

```haskell
THEN (▶)  : (a → b) → (b → c) → (a → c)   -- sequential composition
SPLIT (∆) : (a → b) → (a → c) → (a → (b,c)) -- parallel fork
```

## Fundamental Laws

1. **THEN associative**: `(f ▶ g) ▶ h = f ▶ (g ▶ h)`
2. **THEN non-commutative**: `f ▶ g ≠ g ▶ f`
3. **SPLIT coassociative**: distributes input without side effects
4. **FOCUS pure**: `None` = drop event, `Some(y)` = emit transformed
5. **SCAN causal**: output at `t` depends only on state from `t-1`
6. **DELAY prevents loops**: any cycle must contain ≥1 DELAY
7. **MERGE monoid**: associative with `None` as identity

## B2 Discipline Rules

- **R0**: All λ are unary (multi-arg via pairs)
- **R1**: Only THEN and SPLIT at surface level
- **R2**: Reducers are unary λ taking pairs
- **R3**: Currying by default
- **R4**: ≤2 external phash imports per module
- **R5**: No algebraic loops (enforced by DELAY)

## Categorical Foundation

```
Arrow + ArrowChoice + ArrowLoop = Complete
```

- **Arrow**: THEN (>>>), id, SPLIT (***)
- **ArrowChoice**: FOCUS (Kleisli Option), MERGE
- **ArrowLoop**: DELAY + SCAN (feedback with causality)

## Why This Is Complete

1. **Self-similarity**: Any subgraph folds to unary λ (preserves B2)
2. **Multi-scale**: DELAY gives time grains, SCAN gives local state
3. **Provable**: Minimal alphabet → simpler PAC bounds
4. **No zoo**: All common operators expressible via this core

## Import Convention

Core atoms (`id`, `FOCUS`, `SCAN`, `DELAY`, `MERGE`) don't count toward the ≤2 import limit as they're part of the kernel.

---

*6 atoms. 2 combinators. ∞ fractal compositions. Zero ambiguity.*