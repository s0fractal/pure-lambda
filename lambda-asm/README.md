# λ-ASM v0 - Minimal Core

**6 opcodes → ∞ compositions**

## ✨ What Is This?

A minimal assembly-like language with just 6 instructions that compiles to deterministic protein-hashes. No dependencies, no versions, no human semantics — just pure λ form.

## 🎯 The 6 Opcodes

```
CONST r, v         ; Set register to constant
LOAD  r, input[i]  ; Load from input array
ADD   rA, rB → rC  ; Addition (or rA, value → rB)
MUL   rA, rB → rC  ; Multiplication
SIN   rA → rB      ; Sine function
OUT   r, "target"  ; Output to SVG attribute
```

## 🚀 Quick Demo

```bash
# Run once with inputs [t=π/2, scale=30]
node runner.mjs run 1.57 30

# Generate animated HTML
node runner.mjs animate
open animation.html
```

## 📜 Example Program (prog.lasm)

```asm
; Breathing circle animation
LOAD  r0, input[0]    ; r0 = t (time)
LOAD  r18, input[1]   ; r18 = s (scale)
SIN   r0 -> r1        ; r1 = sin(t)
MUL   r1, r18 -> r2   ; r2 = sin(t) * s
ADD   r2, 150 -> r3   ; r3 = cx = 150 + sin(t)*s
OUT   r3, "circle.cx"
```

## 🧬 Program Hash

Every program compiles to a unique hash based on its opcode sequence:

```javascript
phash = SHA256("pl/lasm-v0" || OpSeq)
// Example: 4e8bc3af53116fcf3cf1651ee4aa3079a521a78ab422
```

## 🎨 Output Mapping

The `OUT` instruction maps register values to:
- SVG attributes: `OUT r3, "circle.cx"`
- CSS custom properties: `OUT r4, "--x-pos"`
- Any DOM attribute via element.attribute notation

## 🔮 Why This Works

1. **Finite core**: 6 opcodes = controlled complexity
2. **Early binding**: All "dependencies" are just inlined constants
3. **Pure form**: Identity = opcode sequence (no external refs)
4. **Composable**: Programs concatenate naturally

## 📊 Animation Features

- 60 FPS smooth animation
- Real-time register execution
- Direct SVG manipulation
- No libraries, pure browser APIs

## 🌀 Integration with Pure Lambda

Each λ-ASM program generates:
- **Receipt**: Gate G0, lattice_ref, hash
- **Profile**: Can be memoized (MEMO) or parallelized (PAR)
- **phash**: Deterministic identity for caching

---

**Total implementation: 3 files, ~300 lines, zero dependencies.**

*Form follows function. Function is form.*