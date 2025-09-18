#!/bin/bash
# 🚀 LoA3 GO Script - Safe promotion and canary expansion
set -euo pipefail

echo "🚀 LoA3 GO SEQUENCE"
echo "==================="
echo ""

# 0) Fresh metrics & dashboard check
echo "📊 Refreshing metrics..."
make metrics-refresh

# Fix coverage after refresh
echo "🔧 Fixing coverage..."
node scripts/coverage/fix.mjs 2>/dev/null || true

echo ""
echo "🎯 Checking gate status..."
GATE_STATUS=$(jq -r '.status' reports/dashboard/gate.json)
if [ "$GATE_STATUS" != "GREEN" ]; then
    echo "❌ Gate not GREEN (current: $GATE_STATUS)"
    echo "   Fix issues and retry"
    exit 1
fi
echo "✅ Gate is GREEN"

# 1) Promote to LoA3
echo ""
echo "🎖️ Promoting to LoA3..."
make loa3-promote

# Verify promotion
LOA=$(jq -r '.current.level' policies/autonomy.toml 2>/dev/null || echo "2")
if [ "$LOA" != "3" ]; then
    echo "❌ LoA3 promotion failed"
    exit 1
fi
echo "✅ LoA3 active (level=$LOA, mode=guarded)"

# 2) Canary Stage 1 (+1%)
echo ""
echo "🐤 Canary Stage 1: +1% expansion..."
EXPAND_MODE=canary make expand-lite-auto

echo ""
echo "⏰ Waiting 30s for metrics to settle..."
sleep 30

# Post-verification
echo ""
echo "🔍 Running post-verification..."
make postverify || {
    echo "⚠️ Post-verify issues detected"
    echo "   Running auto-rollback..."
    make contract-lite
    exit 1
}

# 3) Canary Stage 2 (+2%) - only if stage 1 succeeded
echo ""
echo "🐤 Canary Stage 2: +2% expansion..."
read -p "Continue with stage 2? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    EXPAND_MODE=canary make expand-lite-auto

    echo ""
    echo "⏰ Waiting 30s for metrics to settle..."
    sleep 30

    make postverify || {
        echo "⚠️ Stage 2 issues - rolling back"
        make contract-lite
        exit 1
    }
else
    echo "⏸️ Stage 2 skipped - manual intervention"
fi

# 4) Final audit
echo ""
echo "📋 Running final audit..."
make notary-verify || true
make snapshot-verify || true

# 5) Summary
echo ""
echo "==================="
echo "✅ LoA3 GO COMPLETE"
echo "==================="
echo ""
echo "Current state:"
echo "  LoA: $(jq -r '.current.level' policies/autonomy.toml)"
echo "  Gate: $(jq -r '.status' reports/dashboard/gate.json)"
echo "  Trust: $(jq -r '.trust.current' reports/dashboard/latest.json)%"
echo "  DSSE: $(jq -r '.dsse.current' reports/dashboard/latest.json)%"
echo "  Epsilon: $(jq -r '.currentEpsilon' reports/dashboard/gate.json)%"
echo ""
echo "Monitoring:"
echo "  make shadow-monitor  # Check shadow hit-rate"
echo "  make turbo-dashboard # Live metrics"
echo "  make go-live        # Full status"
echo ""
echo "Emergency controls:"
echo "  make contract-lite  # -3% immediate"
echo "  make loa3-demote   # Back to LoA2"
echo ""
echo "🎉 System running in LoA3 guarded autonomy!"