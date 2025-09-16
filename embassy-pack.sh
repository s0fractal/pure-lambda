#!/bin/bash
# Create Embassy Pack - Self-contained lattice control for distribution

echo "📦 Building Embassy Pack..."

# Create temp directory
PACK_DIR="embassy-pack-v1"
rm -rf $PACK_DIR
mkdir -p $PACK_DIR

# Copy core files
echo "  Copying core components..."
cp fractal-lattice/LATTICE@v1.json $PACK_DIR/
cp fractal-lattice/lattice-control.js $PACK_DIR/
cp fractal-lattice/conformance-v1.js $PACK_DIR/
cp cli/verify.mjs $PACK_DIR/

# Copy configs
mkdir -p $PACK_DIR/policies
cp policies/lattice-profiles.yaml $PACK_DIR/policies/
cp policies/thresholds.toml $PACK_DIR/policies/

# Copy sample receipts
mkdir -p $PACK_DIR/samples
cp fractal-lattice/context.jsonl $PACK_DIR/samples/stable-context.jsonl
head -10 fractal-lattice/context.jsonl > $PACK_DIR/samples/quick-test.jsonl

# Copy verification files
cp fractal-lattice/lattice.json $PACK_DIR/
cp fractal-lattice/rules.md $PACK_DIR/
cp fractal-lattice/stability.md $PACK_DIR/

# Create README
cat > $PACK_DIR/README.md << 'EOF'
# Lambda Control Embassy Pack v1

Self-contained lattice control system. No external dependencies.

## Quick Start

```bash
# Test decision engine
node lattice-control.js

# Run conformance tests
node conformance-v1.js

# Verify integrity
node verify.mjs check LATTICE@v1.json
```

## What's Included

- `LATTICE@v1.json` - Immutable lattice snapshot (J=1.0)
- `lattice-control.js` - Decision engine
- `conformance-v1.js` - 40 canonical tests
- `verify.mjs` - Cryptographic verification
- `policies/` - Profiles and thresholds
- `samples/` - Example receipts

## Key Metrics

- **Stability**: Jaccard = 1.0 (perfect)
- **Speedup**: 1.5-3x depending on profile
- **Profiles**: apex, proof, performance, universal
- **Safety**: Gate #0 blocks side effects

## Usage

```javascript
const { decide } = require('./lattice-control');

const decision = decide([
  'type:pure_function',
  'exec:success',
  'oracle:no_fs'
]);

console.log(decision.profile);    // 'apex'
console.log(decision.confidence); // 1.0
console.log(decision.genes);      // {MEMO:true, PAR:true}
```

## Emergency

Set `PL_POLICY=universal` to force safe mode.

---
*This is a read-only reference implementation. Run locally, observe speedup, then decide.*
EOF

# Create manifest
cat > $PACK_DIR/manifest.json << EOF
{
  "name": "Lambda Control Embassy Pack",
  "version": "1.0.0",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "lattice_cid": "Qm269d9e41fc7ec4fc63027f0bf4828913660405482ea6",
  "stability": {
    "jaccard": 1.0,
    "edges": 1.0,
    "dimension": 0.97
  },
  "contents": [
    "LATTICE@v1.json",
    "lattice-control.js",
    "conformance-v1.js",
    "verify.mjs",
    "policies/",
    "samples/"
  ]
}
EOF

# Create zip
echo "  Creating archive..."
zip -qr embassy-pack-v1.zip $PACK_DIR

# Cleanup
rm -rf $PACK_DIR

echo "✅ Embassy Pack created: embassy-pack-v1.zip"
echo "   Size: $(du -h embassy-pack-v1.zip | cut -f1)"
echo "   Share freely - it's self-contained and read-only"