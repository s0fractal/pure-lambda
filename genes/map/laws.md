# Laws of Map

These laws must hold for ALL manifestations of the map gene.

## 1. Length Preservation

```
∀xs. length(map(xs, f)) = length(xs)
```

The mapped list always has the same length as the input.

## 2. Identity Law

```
∀xs. map(xs, id) = xs
```

Mapping with identity function returns the original list.

## 3. Composition Fusion

```
∀xs,f,g. map(map(xs, f), g) = map(xs, compose(g, f))
```

Double mapping can be fused into single map with composed function.

## 4. Structure Preservation

```
∀xs. structure(map(xs, f)) = structure(xs)
```

Map preserves the container structure (order, nesting).

## 5. Functor Laws

### 5.1 Functor Identity
```
map(id) = id
```

### 5.2 Functor Composition
```
map(g ∘ f) = map(g) ∘ map(f)
```

## Metamorphic Relations

These properties enable testing without knowing exact outputs:

1. **Permutation**: Order of elements affects result order
2. **Subset**: Mapping subset gives subset of mapped whole
3. **Constant function**: map(xs, const(c)) = replicate(length(xs), c)

## Proof Obligations

Each manifestation must:
1. Extract to the same λ-IR
2. Pass all law tests
3. Match cross-language test vectors
4. Preserve semantic soul (p-hash)