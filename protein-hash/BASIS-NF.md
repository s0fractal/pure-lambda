# Basis Normal Form Specification

## Principle: Zero Dependencies

**phash = BLAKE3("pl/ph2-basisnf-v0" || OpSeq)**

Every λ is compiled to a **dependency-free opcode sequence**. No external references, no human names, no semver chaos.

## Minimal Opcode Basis (8 opcodes)

```
0x00 LAM    ; λ-abstraction (de Bruijn)
0x01 APP    ; application (left-associative)
0x02 VAR    ; variable (de Bruijn index)
0x03 LIT    ; literal (canonical encoding)
0x04 PAIR   ; constructor
0x05 FST    ; first projection
0x06 SND    ; second projection
0x07 FIX    ; fixed point (optional recursion)
```

## Compilation Pipeline

```
Source λ → Parse → de Bruijn → λ-lifting → β/η-normalization → OpSeq emission
```

### λ-lifting (Closure Elimination)
- External dependencies become **parameters**
- `f(x) calls g` becomes `f(x, g)`
- No environment captures, only arguments

### Canonical Form Rules
- α-invariant (de Bruijn indices)
- Left-associative applications
- Stable literal encoding (CBOR-sorted)
- No free variables in final OpSeq

## Example

```javascript
// Before: depends on external `add`
const multiply = (x, y) => add(x, add(x, y-1))

// After λ-lifting:
const multiply = (x, y, add) => add(x, add(x, y-1))

// OpSeq: [LAM, LAM, LAM, VAR(2), VAR(0), VAR(2), VAR(0), LIT(1), ...]
// phash = BLAKE3("pl/ph2-basisnf-v0" || OpSeq)
```

## Properties

✅ **α-invariant**: Renaming parameters doesn't change phash
✅ **Dependency-free**: Identity independent of external environment
✅ **Stable**: Equivalent λ forms produce identical OpSeq
✅ **Minimal**: MDL-pruning selects shortest canonical form

## Encoding

```
OpSeq = [opcode1, opcode2, ...]
Literal encoding: CBOR with stable field ordering
phash = BLAKE3("pl/ph2-basisnf-v0" || encode(OpSeq))
```

---

*One λ form → One phash. No exceptions, no dependencies, no human names.*