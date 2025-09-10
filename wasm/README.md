# WASM as Primary Body

WebAssembly is the primary body for pure lambda genes - a universal runtime that transcends language boundaries.

## Architecture

```
Gene (λ-IR) → WASM Module → Runtime
     ↓           ↓            ↓
   Soul      Binary Body   Any Platform
```

## Components

1. **λ-to-WASM Compiler** (`lambda-wasm.js`)
   - Compiles λ-IR to WebAssembly Text (WAT)
   - Generates minimal, pure modules
   - No runtime dependencies

2. **WASM Runtime** (`runtime.js`)
   - Loads and executes WASM modules
   - Provides memory management
   - Handles cross-module composition

3. **Component Model** (`component.wit`)
   - WASI Component Model interface
   - Defines gene signatures
   - Enables cross-language interop

## Benefits

- **Universal**: Runs everywhere (browser, Node, Deno, Wasmtime)
- **Fast**: Near-native performance
- **Small**: Minimal binary size
- **Pure**: No side effects, deterministic execution
- **Composable**: Functions compose at binary level

## Usage

```javascript
// Load WASM gene
const map = await loadGene('map.wasm');

// Use like any function
const result = map([1, 2, 3], x => x * 2);
// [2, 4, 6]
```

## Building

```bash
# Compile all genes to WASM
node wasm/compiler.js

# Test WASM modules
node wasm/test.js

# Generate component interfaces
wasm-tools component new genes/*/wasm/*.wat
```