# SDK Quickstart Guide

This guide shows how to use Pure Lambda SDKs in TypeScript, Python, and Rust to work with seeds and operons.

## TypeScript SDK

### Installation
```bash
cd sdks/typescript
npm install
npm run build
```

### Basic Usage
```typescript
import { loadSeed, toOperon, runAutopilot } from './sdks/typescript';

async function quickstart() {
  // Load and verify a seed
  const seed = await loadSeed('path/to/seed.car');
  console.log('Loaded seed:', seed.name, 'v' + seed.version);

  // Convert to operon for execution
  const operon = toOperon(seed);
  console.log('Operon has', operon.tiles.length, 'tiles');

  // Run with autopilot
  const result = await runAutopilot(operon, {
    timeout: 30000,
    sandbox: true,
    verbose: true
  });

  console.log('Execution result:', result);
}

quickstart().catch(console.error);
```

### Advanced Features
```typescript
import {
  createSeed,
  signSeed,
  verifySeed,
  packSeed,
  unpackSeed
} from './sdks/typescript';

// Create a new seed
const newSeed = createSeed({
  name: 'my-operon',
  tiles: [{
    op: 'TRANSFORM',
    code: 'x => x.map(v => v * 2)',
    abi: {
      types: 'number[] -> number[]',
      effects: [],
      ports: { in: 'data', out: 'doubled' }
    },
    law: 'pure',
    cost: 'O(n)'
  }]
});

// Sign with DSSE
const signed = await signSeed(newSeed, process.env.PL_ED25519_SECRET);

// Pack to CAR format
const packed = await packSeed(signed);
await packed.write('output.car');

// Verify round-trip
const unpacked = await unpackSeed('output.car');
const verified = await verifySeed(unpacked);
console.log('Round-trip successful:', verified);
```

## Python SDK

### Installation
```bash
cd sdks/python
pip install -e .
```

### Basic Usage
```python
from pl_sdk import load_seed, to_operon, run_autopilot

def quickstart():
    # Load and verify a seed
    seed = load_seed('path/to/seed.car')
    print(f"Loaded seed: {seed['name']} v{seed['version']}")

    # Convert to operon for execution
    operon = to_operon(seed)
    print(f"Operon has {len(operon['tiles'])} tiles")

    # Run with autopilot
    result = run_autopilot(operon,
        timeout=30.0,
        sandbox=True,
        verbose=True
    )

    print(f"Execution result: {result}")

if __name__ == '__main__':
    quickstart()
```

### Advanced Features
```python
from pl_sdk import (
    create_seed,
    sign_seed,
    verify_seed,
    pack_seed,
    unpack_seed
)
import os

# Create a new seed
new_seed = create_seed({
    'name': 'my-operon',
    'tiles': [{
        'op': 'FILTER',
        'code': 'lambda items: [x for x in items if x > 0]',
        'abi': {
            'types': 'list[number] -> list[number]',
            'effects': [],
            'ports': {'in': 'data', 'out': 'filtered'}
        },
        'law': 'pure',
        'cost': 'O(n)'
    }]
})

# Sign with DSSE
signed = sign_seed(new_seed, os.environ.get('PL_ED25519_SECRET'))

# Pack to CAR format
packed = pack_seed(signed)
with open('output.car', 'wb') as f:
    f.write(packed)

# Verify round-trip
unpacked = unpack_seed('output.car')
verified = verify_seed(unpacked)
print(f"Round-trip successful: {verified}")
```

## Rust SDK

### Installation
Add to your `Cargo.toml`:
```toml
[dependencies]
pure_lambda_sdk = { path = "../../sdks/rust" }
tokio = { version = "1.0", features = ["full"] }
```

### Basic Usage
```rust
use pure_lambda_sdk::{load_seed, to_operon, run_autopilot};
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Load and verify a seed
    let seed = load_seed("path/to/seed.car").await?;
    println!("Loaded seed: {} v{}", seed.name, seed.version);

    // Convert to operon for execution
    let operon = to_operon(seed)?;
    println!("Operon has {} tiles", operon.tiles.len());

    // Run with autopilot
    let result = run_autopilot(operon, 30000, true).await?;
    println!("Execution result: {:?}", result);

    Ok(())
}
```

### Advanced Features
```rust
use pure_lambda_sdk::{
    create_seed,
    sign_seed,
    verify_seed,
    pack_seed,
    unpack_seed,
    Tile, ABI
};
use std::collections::HashMap;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Create a new seed
    let tile = Tile {
        op: "REDUCE".to_string(),
        code: Some("numbers.fold(0, |acc, x| acc + x)".to_string()),
        abi: ABI {
            types: "Vec<i32> -> i32".to_string(),
            effects: vec![],
            ports: {
                let mut ports = HashMap::new();
                ports.insert("in".to_string(), "numbers".to_string());
                ports.insert("out".to_string(), "sum".to_string());
                ports
            },
        },
        law: "associative".to_string(),
        cost: "O(n)".to_string(),
    };

    let new_seed = create_seed("my-operon", vec![tile])?;

    // Sign with DSSE
    let secret = env::var("PL_ED25519_SECRET")?;
    let signed = sign_seed(new_seed, &secret).await?;

    // Pack to CAR format
    let packed = pack_seed(signed).await?;
    std::fs::write("output.car", packed)?;

    // Verify round-trip
    let unpacked = unpack_seed("output.car").await?;
    let verified = verify_seed(&unpacked).await?;
    println!("Round-trip successful: {}", verified);

    Ok(())
}
```

## Cross-Language Interoperability

All SDKs produce identical output for the same inputs, ensuring cross-platform compatibility:

### TypeScript ↔ Python
```bash
# Pack with TypeScript
node typescript_pack.js input.json output.car

# Verify with Python
python python_verify.py output.car
```

### Python ↔ Rust
```bash
# Pack with Python
python pack_seed.py input.json output.car

# Verify with Rust
cargo run --bin verify_seed output.car
```

### Rust ↔ TypeScript
```bash
# Pack with Rust
cargo run --bin pack_seed input.json output.car

# Verify with TypeScript
node verify_seed.js output.car
```

## Common Patterns

### Error Handling
```typescript
// TypeScript
try {
  const result = await runAutopilot(operon, options);
} catch (error) {
  if (error.code === 'TIMEOUT') {
    console.log('Execution timed out');
  } else if (error.code === 'SANDBOX_VIOLATION') {
    console.log('Sandbox security violation');
  }
}
```

```python
# Python
try:
    result = run_autopilot(operon, **options)
except TimeoutError:
    print("Execution timed out")
except SandboxError:
    print("Sandbox security violation")
```

```rust
// Rust
match run_autopilot(operon, timeout, sandbox).await {
    Ok(result) => println!("Success: {:?}", result),
    Err(e) if e.is_timeout() => println!("Execution timed out"),
    Err(e) if e.is_sandbox_violation() => println!("Sandbox security violation"),
    Err(e) => println!("Error: {}", e),
}
```

### Batch Processing
```typescript
// TypeScript - Process multiple seeds
const seeds = await Promise.all([
  'seed1.car',
  'seed2.car',
  'seed3.car'
].map(loadSeed));

const results = await Promise.all(
  seeds.map(seed => runAutopilot(toOperon(seed), options))
);
```

```python
# Python - Process multiple seeds
import asyncio

async def process_seeds(paths):
    seeds = await asyncio.gather(*[load_seed(p) for p in paths])
    operons = [to_operon(seed) for seed in seeds]
    results = await asyncio.gather(*[
        run_autopilot(op, **options) for op in operons
    ])
    return results

paths = ['seed1.car', 'seed2.car', 'seed3.car']
results = asyncio.run(process_seeds(paths))
```

```rust
// Rust - Process multiple seeds
use tokio::try_join;

async fn process_seeds(paths: &[&str]) -> Result<Vec<ExecutionResult>, Box<dyn Error>> {
    let mut handles = vec![];

    for path in paths {
        let path = path.to_string();
        let handle = tokio::spawn(async move {
            let seed = load_seed(&path).await?;
            let operon = to_operon(seed)?;
            run_autopilot(operon, 30000, true).await
        });
        handles.push(handle);
    }

    let mut results = vec![];
    for handle in handles {
        results.push(handle.await??);
    }

    Ok(results)
}
```

## Performance Tips

1. **Reuse Loaded Seeds**: Cache loaded seeds to avoid repeated I/O
2. **Parallel Execution**: Use async/await for concurrent operations
3. **Streaming**: For large datasets, use streaming APIs when available
4. **Memory Management**: Configure appropriate timeouts and limits
5. **Verification**: Balance security needs with performance requirements