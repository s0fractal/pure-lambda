# B2 Core - Complete Fractal Algebra

## 🎯 The Formula

**6 atoms + 2 combinators = ∞ compositions**

```haskell
Core = {id, FOCUS, SCAN, DELAY, MERGE, PAIR}
Combinators = {THEN (▶), SPLIT (∆)}
```

## 🔬 Why B2 Is Complete

With just these 8 primitives, we have:

- **Arrow**: Sequential composition (THEN), parallel fork (SPLIT)
- **ArrowChoice**: Routing/filtering (FOCUS + MERGE)
- **ArrowLoop**: Feedback with causality (DELAY + SCAN)

This gives us the complete **Arrow + Choice + Loop** algebra - mathematically sufficient for any stream processing pattern.

## 📐 B2 Discipline

1. **All λ are unary** (multi-arg via pairs)
2. **Only THEN/SPLIT at surface** (no operator zoo)
3. **≤2 external imports** per module (core doesn't count)
4. **No algebraic loops** (enforced by DELAY requirement)
5. **Order matters**: `a ▶ b ≠ b ▶ a` (non-commutative)

## 🔄 RxJS → B2 Translation

Every RxJS operator translates to B2 patterns:

| RxJS | B2 Pattern |
|------|------------|
| `map(f)` | `FOCUS(x => Some(f(x)))` |
| `filter(p)` | `FOCUS(x => p(x) ? Some(x) : None)` |
| `scan(f, seed)` | `SCAN((acc,x) => (f(acc,x), Some(...)))` |
| `debounceTime(ms)` | `SCAN((lastT,{t,x}) => ...)` |
| `distinctUntilChanged()` | `SCAN((prev,x) => ...)` |
| `merge(a,b)` | `(a ∆ b) ▶ MERGE` |
| `zip(a,b)` | `(a ∆ b) ▶ SCAN(queue logic)` |

See [operators.md](operators.md) for complete table.

## 🚀 Quick Start

### 1. Write B2 Pattern
```javascript
// Debounce + distinct pattern
const pattern =
  SCAN(timeWindow) ▶
  FOCUS(extract) ▶
  SCAN(uniqueness) ▶
  FOCUS(emit)
```

### 2. Verify B2 Compliance
```bash
node b2-verify.js mypattern.b2

✅ B2 compliant!
📦 External imports: sensor_a, reducer_b
📊 Tree structure:
└─THEN
  ├─SCAN
  └─FOCUS
```

### 3. Generate phash
Every B2 pattern compiles to deterministic phash:
```
phash = BLAKE3("pl/b2-v0" || serialized_tree)
```

## 🎨 Example Patterns

### Throttle with Backpressure
```
(stream ∆ clock) ▶
SCAN(queue) ▶
FOCUS(rateLimit) ▶
MERGE
```

### Sliding Window Average
```
SCAN(window) ▶
FOCUS(average) ▶
DELAY ▶
MERGE
```

### Event Sourcing with Replay
```
(events ∆ snapshots) ▶
SCAN(reduce) ▶
SPLIT ▶
(DELAY ∆ id) ▶
MERGE
```

## 📊 Properties

- **Pure**: No side effects (Gate G0 enforced)
- **Causal**: Output at t depends only on inputs ≤t
- **Deterministic**: Same inputs → same phash → same outputs
- **Fractal**: Any subgraph folds to unary λ (self-similar)
- **Minimal**: No operator zoo, just 8 primitives

## 🔗 Integration

B2 patterns integrate with:
- **Pure Lambda**: Each pattern gets receipt with Gate G0
- **Lattice Control**: PAC bounds for pattern compositions
- **Protein Hash**: Every B2 tree has unique phash identity

---

*Finite core. Infinite compositions. Zero ambiguity.*

*This is your complete stream algebra in 8 symbols.*