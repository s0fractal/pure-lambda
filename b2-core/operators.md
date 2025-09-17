# B2 Operator Translation Table

## RxJS → B2 Patterns

### Basic Transformations

| RxJS Operator | B2 Implementation | Notes |
|--------------|-------------------|-------|
| `map(f)` | `FOCUS(x => Some(f(x)))` | Pure transformation |
| `filter(p)` | `FOCUS(x => p(x) ? Some(x) : None)` | Conditional emit |
| `tap(f)` | `FOCUS(x => { f(x); return Some(x) })` | Side effect (breaks G0!) |

### Filtering & Limiting

| RxJS Operator | B2 Implementation | Notes |
|--------------|-------------------|-------|
| `take(n)` | `SCAN((k,x) => k>0 ? (k-1, Some(x)) : (0, None))` | Stateful counter |
| `skip(n)` | `SCAN((k,x) => k>0 ? (k-1, None) : (0, Some(x)))` | Inverse of take |
| `first()` | `take(1)` | Alias pattern |
| `last()` | `SCAN((prev,x) => (Some(x), None)) ▶ MERGE` | Hold until complete |

### Time-based

| RxJS Operator | B2 Implementation | Notes |
|--------------|-------------------|-------|
| `delay(ms)` | `DELAY` (repeated n times for n ticks) | Pure time shift |
| `debounceTime(ms)` | `SCAN((lastT,{t,x}) => t-lastT>=ms ? (t,Some(x)) : (lastT,None))` | Time windowing |
| `throttleTime(ms)` | `SCAN((lastT,{t,x}) => t-lastT>=ms ? (t,Some(x)) : (lastT,None))` | Rate limiting |
| `sample(trigger)` | `(stream ∆ trigger) ▶ FOCUS(([x,t]) => t ? Some(x) : None)` | Trigger-based |

### Accumulation

| RxJS Operator | B2 Implementation | Notes |
|--------------|-------------------|-------|
| `scan(f, seed)` | `SCAN((acc,x) => let acc'=f(acc,x) in (acc',Some(acc')))` | Running accumulator |
| `reduce(f, seed)` | `SCAN((acc,x) => (f(acc,x), None)) ▶ last()` | Final value only |
| `count()` | `SCAN((n,_) => (n+1, Some(n+1)))` | Running counter |
| `toArray()` | `SCAN((arr,x) => ([...arr,x], None)) ▶ last()` | Collect all |

### Combination

| RxJS Operator | B2 Implementation | Notes |
|--------------|-------------------|-------|
| `merge(a, b)` | `(a ∆ b) ▶ MERGE` | Left-biased union |
| `concat(a, b)` | `a ▶ FOCUS(x => x ? Some(x) : b)` | Sequential |
| `zip(a, b)` | `(a ∆ b) ▶ SCAN(([qa,qb],[a,b]) => ...)` | Queue-based sync |
| `combineLatest` | `(a ∆ b) ▶ SCAN(([la,lb],[a,b]) => ...)` | Latest values |
| `withLatestFrom` | `(main ∆ other) ▶ FOCUS(([m,o]) => m ? Some([m,o]) : None)` | Main-driven |

### Uniqueness

| RxJS Operator | B2 Implementation | Notes |
|--------------|-------------------|-------|
| `distinctUntilChanged()` | `SCAN((prev,x) => (x, prev!=x ? Some(x) : None))` | Adjacent dedup |
| `distinct()` | `SCAN((seen,x) => (seen.add(x), seen.has(x) ? None : Some(x)))` | Global dedup |
| `distinctUntilKeyChanged(k)` | `SCAN((prev,x) => (x[k], prev!=x[k] ? Some(x) : None))` | Key-based |

### Error Handling (Gate G0 context)

| RxJS Operator | B2 Implementation | Notes |
|--------------|-------------------|-------|
| `catchError(f)` | Not needed - pure λ can't error | Gate G0 guarantee |
| `retry(n)` | Not applicable - no failures | Pure functions only |
| `timeout(ms)` | `SCAN + time check` | Time as explicit input |

## Complex Patterns

### Buffer with Time Windows
```
bufferTime(100ms) =
  SCAN((buf,lastT,{t,x}) =>
    t-lastT >= 100
      ? ([], t, Some(buf))
      : ([...buf,x], lastT, None))
```

### Sliding Window
```
windowCount(3) =
  SCAN((win,x) =>
    let win' = [...win,x].slice(-3)
    in (win', Some(win')))
```

### Switch Map (simplified)
```
switchMap(f) =
  FOCUS(x => Some(f(x))) ▶
  SCAN((current,next) => (next, Some(next)))
```

## B2 Advantages

1. **No hidden state**: All state explicit in SCAN pairs
2. **No timing ambiguity**: Time as explicit input (t,x)
3. **No error states**: Gate G0 ensures pure execution
4. **Composable**: Any pattern becomes new unary λ
5. **Traceable**: Every step has deterministic phash

---

*Every RxJS operator = B2 pattern. No magic. Pure λ all the way down.*