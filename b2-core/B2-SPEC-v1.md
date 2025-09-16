# B2-SPEC v1 - Canonical Form

## Alphabet

```
Atoms = {id, FOCUS, SCAN, DELAY, MERGE, PAIR}
Combinators = {THEN (▶), SPLIT (∆)}
```

## Type Signatures

```haskell
id    : a → a
FOCUS : a → Option b
SCAN  : (s, a) → (s', Option b)
DELAY : a_t → a_{t-1}
MERGE : (Option a, Option a) → Option a
PAIR  : (a, b) → (a, b)

THEN  : (a → b) → (b → c) → (a → c)
SPLIT : (a → b) → (a → c) → (a → (b, c))
```

## Fundamental Laws

1. **THEN associative**: `(f ▶ g) ▶ h = f ▶ (g ▶ h)`
2. **SPLIT coassociative**: Distributes input without side effects
3. **MERGE monoid**: Identity = `None`, Operation = left-biased union
4. **SCAN causal**: Output_t depends only on State_{t-1} and Input_t
5. **DELAY requirement**: Every cycle must contain ≥1 DELAY (no algebraic loops)

## Serialization (IR)

```json
{"op": "THEN", "left": {...}, "right": {...}}
{"op": "SPLIT", "left": {...}, "right": {...}}
{"op": "ATOM", "name": "FOCUS", "params": {...}}
```

## Identity

```
phash = BLAKE3("pl/b2-v1" || CBOR(tree))
```

## Receipt

```json
{
  "hash": "phash_value",
  "gate": "G0",
  "lattice_ref": "Qm...",
  "proofs": ["determinism", "causality", "no_loops"]
}
```

## Constraints

- All λ are unary (multi-arg via PAIR)
- ≤2 external imports per module (atoms don't count)
- Order preserved: `a ▶ b ≠ b ▶ a`

---

*8 symbols. Infinite compositions. Zero ambiguity.*