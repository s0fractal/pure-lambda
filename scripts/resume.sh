#!/usr/bin/env bash
# Resume development from any time discontinuity
# This is your "continue" button after days/months/years

set -euo pipefail

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      λ-ORGANISM RESUME                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo

# 1. Show current state
echo "📍 Current location:"
echo "   Branch: $(git branch --show-current)"
echo "   Commit: $(git rev-parse --short HEAD)"
echo "   Status: $(git status --porcelain | wc -l) uncommitted changes"
echo

# 2. Verify proofs still hold
echo "🔬 Verifying proofs..."
if [ -f "gene-md-simple.js" ]; then
    node gene-md-simple.js verify docs/genome/FOCUS.md || {
        echo "⚠️  Some proofs failed - investigate before continuing"
        exit 1
    }
    echo "   ✅ All proofs PASS"
else
    echo "   ⚠️  Proof verifier not found - skipping"
fi
echo

# 3. Run 100× benchmarks (non-critical, so || true)
echo "⚡ Running 100× benchmarks..."
if [ -f "run-100x-benchmarks.sh" ]; then
    ./run-100x-benchmarks.sh 2>/dev/null | tail -5 || true
else
    echo "   Benchmark script not found - skipping"
fi
echo

# 4. Check if we can build
echo "🔨 Checking build..."
cd lambda-kernel/core
cargo check --no-default-features 2>/dev/null && echo "   ✅ λ-kernel builds (no_std)" || echo "   ⚠️  Build issues"
cd ../..

cd devour-core
cargo check 2>/dev/null && echo "   ✅ Devour-core builds" || echo "   ⚠️  Build issues"
cd ..
echo

# 5. Generate fresh state
echo "📊 Refreshing STATE.md..."
if [ -f "scripts/gen_state_md.js" ]; then
    node scripts/gen_state_md.js
else
    echo "   Generator not found - creating basic STATE.md"
    cat > STATE.md << 'EOF'
# STATE (manual)
Date: $(date -u +%FT%TZ)
Commit: $(git rev-parse --short HEAD)

## How to Resume
1. Read MANIFEST.intent for project philosophy
2. Check README.md for accomplishments
3. Run this script again: ./scripts/resume.sh
EOF
fi
echo

# 6. Show next steps from manifest
echo "📋 Next steps (from MANIFEST.intent):"
if [ -f "MANIFEST.intent" ]; then
    grep -A 10 "checklist_next:" MANIFEST.intent | tail -n +2 | head -5
else
    echo "   MANIFEST.intent not found"
fi
echo

# 7. Final instructions
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                         READY TO CONTINUE                      ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║ 1. Read STATE.md for current status                            ║"
echo "║ 2. Check MANIFEST.intent for invariants                        ║"
echo "║ 3. Your last work was on: $(git log -1 --format=%s | cut -c1-35)... ║"
echo "║ 4. To see recent activity: git log --oneline -10               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo
echo "The organism lives. Continue its evolution. 🧬"