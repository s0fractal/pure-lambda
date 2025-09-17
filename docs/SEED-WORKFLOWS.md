# Seed Workflows Guide

This guide covers common workflows for working with Pure Lambda seeds, including CLI operations, DSSE signing, and validation procedures.

## Pack/Unpack Operations

### Basic Packing

#### Pack from JSON File
```bash
# Pack a single JSON file
./cli/pack-seed.js --input data.json --output package.car

# Pack with custom metadata
./cli/pack-seed.js \
    --input data.json \
    --metadata meta.json \
    --output package.car \
    --name "my-operon" \
    --version 2
```

#### Pack from Directory
```bash
# Pack entire directory structure
./cli/pack-seed.js \
    --input ./operon-data/ \
    --output complex-operon.car \
    --recursive

# Pack with exclusions
./cli/pack-seed.js \
    --input ./src/ \
    --output clean-operon.car \
    --exclude "*.tmp,node_modules/*,*.log"
```

#### Pack from stdin
```bash
# Pack JSON from pipe
echo '{"tiles": [{"op": "IDENTITY", "code": "x => x"}]}' | \
./cli/pack-seed.js --stdin --output identity.car

# Pack from command output
curl -s https://api.example.com/operon.json | \
./cli/pack-seed.js --stdin --output remote.car
```

### Basic Unpacking

#### Unpack to Directory
```bash
# Unpack to specific directory
./cli/unpack-seed.js --seed package.car --output ./extracted/

# Unpack with verification
./cli/unpack-seed.js \
    --seed package.car \
    --output ./extracted/ \
    --verify \
    --strict
```

#### Unpack to stdout
```bash
# Extract as JSON to stdout
./cli/unpack-seed.js --seed package.car --stdout

# Extract specific fields
./cli/unpack-seed.js --seed package.car --field "tiles[0].code"

# Pretty print JSON
./cli/unpack-seed.js --seed package.car --stdout --pretty
```

### Advanced Packing Options

#### Schema Validation
```bash
# Pack with custom schema validation
./cli/pack-seed.js \
    --input data.json \
    --schema custom-schema.json \
    --output validated.car \
    --strict-schema

# Pack with built-in PL-SEED-01 validation
./cli/pack-seed.js \
    --input data.json \
    --output standard.car \
    --validate-pl-seed-01
```

#### Compression and Optimization
```bash
# Pack with compression
./cli/pack-seed.js \
    --input large-data.json \
    --output compressed.car \
    --compress \
    --level 9

# Pack with deduplication
./cli/pack-seed.js \
    --input ./operons/ \
    --output deduplicated.car \
    --dedupe \
    --hash-algorithm blake3
```

## DSSE Signing Workflows

### Key Generation

#### Generate New Key Pair
```bash
# Generate Ed25519 key pair
./cli/keygen.js --output keypair.json --algorithm ed25519

# Generate with custom metadata
./cli/keygen.js \
    --output identity.json \
    --algorithm ed25519 \
    --name "my-identity" \
    --email "me@example.com"

# Generate multiple keys for rotation
./cli/keygen.js --output key1.json --algorithm ed25519
./cli/keygen.js --output key2.json --algorithm ed25519
./cli/keygen.js --output key3.json --algorithm ed25519
```

#### Import Existing Keys
```bash
# Import from PEM format
./cli/import-key.js \
    --private-key private.pem \
    --public-key public.pem \
    --output imported.json

# Import from environment variable
export PL_ED25519_SECRET="your-secret-key-here"
./cli/import-key.js --from-env --output env-key.json
```

### Signing Operations

#### Basic Signing
```bash
# Sign a seed package
./cli/sign-seed.js \
    --seed package.car \
    --key keypair.json \
    --output signed.car

# Sign with custom payload type
./cli/sign-seed.js \
    --seed package.car \
    --key keypair.json \
    --output signed.car \
    --payload-type "purelambda/operon+json"
```

#### Batch Signing
```bash
# Sign multiple seeds
./cli/batch-sign.js \
    --seeds "*.car" \
    --key keypair.json \
    --output-dir ./signed/ \
    --parallel 4

# Sign with different keys (key rotation)
./cli/batch-sign.js \
    --seeds "critical-*.car" \
    --keys "key1.json,key2.json,key3.json" \
    --output-dir ./multi-signed/ \
    --require-all-keys
```

#### Advanced Signing
```bash
# Sign with timestamp
./cli/sign-seed.js \
    --seed package.car \
    --key keypair.json \
    --output timestamped.car \
    --timestamp \
    --tsa-url "https://timestamp.authority.com"

# Sign with custom envelope
./cli/sign-seed.js \
    --seed package.car \
    --key keypair.json \
    --output custom.car \
    --envelope-template envelope.json \
    --add-metadata "build=$(git rev-parse HEAD)"
```

### Verification Operations

#### Basic Verification
```bash
# Verify signature
./cli/verify-signature.js \
    --seed signed.car \
    --pubkey keypair.json \
    --verbose

# Verify without key (if embedded)
./cli/verify-signature.js \
    --seed signed.car \
    --auto-verify \
    --strict
```

#### Batch Verification
```bash
# Verify multiple signed seeds
./cli/batch-verify.js \
    --seeds "signed-*.car" \
    --pubkey keypair.json \
    --parallel 8 \
    --output results.json

# Verify with key discovery
./cli/batch-verify.js \
    --seeds "*.car" \
    --keystore ./keys/ \
    --auto-discover \
    --require-valid
```

#### Advanced Verification
```bash
# Verify with policy enforcement
./cli/verify-signature.js \
    --seed signed.car \
    --policy security-policy.json \
    --enforce-timestamp \
    --max-age 86400

# Verify signature chain
./cli/verify-chain.js \
    --seed signed.car \
    --root-ca root.pem \
    --intermediate intermediate.pem \
    --crl revocation-list.json
```

## Round-trip Testing

### Basic Round-trip Tests
```bash
# Basic round-trip test
./cli/test-roundtrip.js --seed package.car

# Round-trip with timing
./cli/test-roundtrip.js \
    --seed package.car \
    --iterations 100 \
    --timing \
    --memory-check

# Round-trip with different formats
./cli/test-roundtrip.js \
    --seed package.car \
    --formats "car,json,cbor" \
    --verify-equivalence
```

### Batch Round-trip Testing
```bash
# Test all seeds in directory
./cli/batch-roundtrip.js \
    --directory ./seeds/ \
    --output results.json \
    --parallel 8 \
    --detailed

# Test with stress conditions
./cli/batch-roundtrip.js \
    --directory ./seeds/ \
    --stress-test \
    --max-memory 512MB \
    --timeout 30s \
    --iterations 1000
```

### Conformance Testing
```bash
# Test against PL-SEED-01 spec
./cli/test-conformance.js \
    --seed package.car \
    --spec PL-SEED-01 \
    --strict \
    --report conformance-report.json

# Test interoperability
./cli/test-interop.js \
    --seed package.car \
    --implementations "typescript,python,rust" \
    --cross-verify
```

## Advanced Workflows

### Multi-format Export
```bash
# Export to multiple formats
./cli/export-seed.js \
    --seed package.car \
    --formats "car,json,yaml,cbor" \
    --output ./exports/ \
    --preserve-metadata

# Export with transformations
./cli/export-seed.js \
    --seed package.car \
    --format json \
    --transform minify \
    --output minified.json
```

### Seed Comparison and Diffing
```bash
# Compare two seeds
./cli/diff-seeds.js \
    --seed1 old.car \
    --seed2 new.car \
    --output diff.json \
    --detailed

# Semantic diff (ignore formatting)
./cli/diff-seeds.js \
    --seed1 old.car \
    --seed2 new.car \
    --semantic \
    --ignore "metadata.stats,createdAt"

# Visual diff output
./cli/diff-seeds.js \
    --seed1 old.car \
    --seed2 new.car \
    --format html \
    --output diff.html
```

### Seed Composition
```bash
# Combine multiple seeds
./cli/compose-seeds.js \
    --seeds "component-*.car" \
    --output composed.car \
    --strategy merge \
    --resolve-conflicts auto

# Create seed dependency graph
./cli/analyze-deps.js \
    --seeds "*.car" \
    --output deps.dot \
    --format graphviz
```

### Performance Profiling
```bash
# Profile seed operations
./cli/profile-seed.js \
    --seed complex.car \
    --operations "pack,unpack,verify" \
    --iterations 1000 \
    --output profile.json

# Memory usage analysis
./cli/analyze-memory.js \
    --seed large.car \
    --track-allocations \
    --gc-pressure \
    --output memory-report.json
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/seed-verification.yml
name: Seed Verification
on: [push, pull_request]

jobs:
  verify-seeds:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Verify all seeds
        run: |
          ./cli/batch-verify.js \
            --seeds "seeds/*.car" \
            --keystore ./keys/ \
            --strict \
            --output verification-results.json

      - name: Test round-trip compliance
        run: |
          ./cli/batch-roundtrip.js \
            --directory ./seeds/ \
            --conformance PL-SEED-01 \
            --fail-fast

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: verification-results
          path: verification-results.json
```

### Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit

# Verify all modified seeds
modified_seeds=$(git diff --cached --name-only --diff-filter=AM | grep '\.car$')

if [ -n "$modified_seeds" ]; then
    echo "Verifying modified seeds..."
    for seed in $modified_seeds; do
        ./cli/verify-signature.js --seed "$seed" --auto-verify --strict
        if [ $? -ne 0 ]; then
            echo "Seed verification failed: $seed"
            exit 1
        fi

        ./cli/test-roundtrip.js --seed "$seed" --quick
        if [ $? -ne 0 ]; then
            echo "Round-trip test failed: $seed"
            exit 1
        fi
    done
    echo "All seed verifications passed!"
fi
```

### Automated Signing Pipeline
```bash
#!/bin/bash
# scripts/sign-release.sh

set -euo pipefail

RELEASE_TAG=${1:-$(git describe --tags)}
SEEDS_DIR="./seeds"
SIGNED_DIR="./dist/signed"
KEY_FILE="${PL_SIGNING_KEY:-./keys/release.json}"

echo "Signing seeds for release: $RELEASE_TAG"

# Create output directory
mkdir -p "$SIGNED_DIR"

# Sign all seeds
./cli/batch-sign.js \
    --seeds "$SEEDS_DIR/*.car" \
    --key "$KEY_FILE" \
    --output-dir "$SIGNED_DIR" \
    --add-metadata "release=$RELEASE_TAG,timestamp=$(date -Iseconds)" \
    --parallel $(nproc)

# Verify all signatures
./cli/batch-verify.js \
    --seeds "$SIGNED_DIR/*.car" \
    --pubkey "$KEY_FILE" \
    --strict \
    --output "$SIGNED_DIR/verification-report.json"

echo "Release signing complete: $SIGNED_DIR"
```

## Troubleshooting

### Common Issues

#### Invalid Signatures
```bash
# Debug signature issues
./cli/debug-signature.js \
    --seed problematic.car \
    --verbose \
    --show-envelope \
    --validate-keys

# Re-sign with fresh key
./cli/strip-signature.js --seed problematic.car --output unsigned.car
./cli/sign-seed.js --seed unsigned.car --key fresh-key.json --output resigned.car
```

#### Corrupted Seeds
```bash
# Analyze seed integrity
./cli/analyze-seed.js \
    --seed corrupted.car \
    --check-integrity \
    --repair \
    --output repaired.car

# Extract recoverable data
./cli/recover-seed.js \
    --seed corrupted.car \
    --partial-ok \
    --output recovered.json
```

#### Performance Issues
```bash
# Profile slow operations
./cli/profile-seed.js \
    --seed slow.car \
    --operations pack,unpack \
    --trace \
    --output performance.trace

# Optimize seed structure
./cli/optimize-seed.js \
    --seed unoptimized.car \
    --strategies "compress,dedupe,reorder" \
    --output optimized.car
```