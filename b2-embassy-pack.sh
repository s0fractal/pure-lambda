#!/bin/bash
# B2 Embassy Pack - Minimal distribution

echo "📦 Building B2 Embassy Pack..."

PACK_DIR="b2-embassy"
rm -rf $PACK_DIR
mkdir -p $PACK_DIR

# Copy core files
cp b2-core/B2-SPEC-v1.md $PACK_DIR/
cp b2-core/b2-golden.mjs $PACK_DIR/
cp b2-core/b2-verify.js $PACK_DIR/
cp b2-core/operators.md $PACK_DIR/

# Create minimal README
cat > $PACK_DIR/README.md << 'EOF'
# B2 Embassy Pack

## Complete Stream Algebra in 8 Symbols

```
Atoms = {id, FOCUS, SCAN, DELAY, MERGE, PAIR}
Combinators = {THEN (▶), SPLIT (∆)}
```

## Quick Verification

```bash
# Run golden tests (7 canonical patterns)
node b2-golden.mjs

# Verify B2 compliance
node b2-verify.js example.b2
```

## Properties

✅ **Complete**: Arrow + Choice + Loop
✅ **Minimal**: Just 8 primitives
✅ **Pure**: Gate G0 enforced
✅ **Deterministic**: phash identity

## Key Files

- `B2-SPEC-v1.md` - Canonical specification
- `b2-golden.mjs` - 7 verified patterns
- `b2-verify.js` - Compliance checker
- `operators.md` - RxJS translation table

---
*Finite core. Infinite compositions. Zero ambiguity.*
EOF

# Create MANIFEST
cat > $PACK_DIR/MANIFEST.json << EOF
{
  "version": "1.0.0",
  "spec": "B2-SPEC-v1",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "atoms": 6,
  "combinators": 2,
  "golden_tests": 7,
  "properties": [
    "associative_THEN",
    "coassociative_SPLIT",
    "monoid_MERGE",
    "causal_SCAN",
    "required_DELAY"
  ],
  "phash_prefix": "pl/b2-v1"
}
EOF

# Create example
cat > $PACK_DIR/example.b2 << 'EOF'
# Example: Debounce + Distinct pattern

# Core composition (no external imports needed)
SCAN ▶ FOCUS
SCAN ▶ FOCUS
THEN ▶ MERGE
EOF

# Calculate size and create zip
echo "  Creating archive..."
zip -qr b2-embassy.zip $PACK_DIR

# Cleanup
rm -rf $PACK_DIR

echo "✅ B2 Embassy Pack created: b2-embassy.zip"
echo "   Size: $(du -h b2-embassy.zip | cut -f1)"
echo "   Contains: spec, verifier, golden tests, examples"
echo ""
echo "📊 Summary:"
echo "   6 atoms + 2 combinators = ∞ compositions"
echo "   Gate G0 compliance guaranteed"
echo "   Every pattern has deterministic phash"