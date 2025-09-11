#!/bin/bash
# Panic build - minimal kernel only

set -e

echo "🔥 PANIC BUILD - Endgame only"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Build lambda-core (no features, pure no_std)
echo "Building lambda-core..."
cd lambda-kernel/core
cargo build --release --no-default-features
cd ../..

# Build devour-core (simple main)
echo "Building devour-core..."
cd devour-core
cargo build --release
cd ..

# Create dist directory
mkdir -p dist

# Report sizes
echo ""
echo "📊 Artifact sizes:"
ls -lh lambda-kernel/core/target/release/*.rlib 2>/dev/null || true
ls -lh devour-core/target/release/devour-core

echo ""
echo "✅ Panic build complete - minimal kernel ready"