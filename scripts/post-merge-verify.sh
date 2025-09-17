#!/bin/bash
# Post-merge verification script for LoA3

set -euo pipefail

echo "🔍 POST-MERGE VERIFICATION"
echo "=========================="
echo ""

# 1. Check current branch
echo "📍 Current branch:"
git branch --show-current
echo ""

# 2. Pull latest changes
echo "📥 Pulling latest from main..."
git pull origin master || git pull origin main
echo ""

# 3. Check LoA status
echo "🎯 LoA Status:"
if [ -f "policies/autonomy.toml" ]; then
    grep "^level" policies/autonomy.toml | head -1
    grep "^apply" policies/autonomy.toml | head -1
    grep "^mode" policies/autonomy.toml | head -1
else
    echo "❌ autonomy.toml not found"
fi
echo ""

# 4. Check gate status
echo "🚦 Gate Status:"
if [ -f "reports/dashboard/gate.json" ]; then
    jq -r '"\(.status) - \(.reason // "ready")"' reports/dashboard/gate.json 2>/dev/null || echo "Gate file exists but empty"
else
    echo "Gate file not yet created"
fi
echo ""

# 5. Check for daily artifacts
echo "📦 Daily Artifacts:"
if [ -f "docs/status/daily.md" ]; then
    echo "✅ daily.md exists"
else
    echo "⏳ daily.md not yet created (runs at 21:05/15/20 UTC)"
fi

if ls receipts/attest/daily-*.envelope.json 1>/dev/null 2>&1; then
    echo "✅ DSSE envelopes found"
else
    echo "⏳ DSSE envelopes not yet created"
fi

if ls dist/snapshots/*.car 1>/dev/null 2>&1; then
    echo "✅ CAR snapshots found"
else
    echo "⏳ CAR snapshots not yet created"
fi
echo ""

# 6. Check metrics freshness
echo "📊 Metrics Status:"
if [ -f "reports/dashboard/latest.json" ]; then
    node -e '
    const d = require("./reports/dashboard/latest.json");
    const age = Math.round((Date.now() - Date.parse(d.timestamp)) / 60000);
    console.log("Age:", age, "minutes");
    console.log("Trust:", d.trust?.current || d.trust?.score || 0, "%");
    console.log("DSSE:", d.dsse?.current || d.dsse?.coverage || 0, "%");
    console.log("Coverage:", d.coverage?.patterns || "unknown");
    '
fi
echo ""

# 7. Canary readiness
echo "🐤 Canary Readiness:"
node -e '
const d = require("./reports/dashboard/latest.json");
const ok = (d.coverage?.patterns === "12/12" &&
           (d.trust?.current || d.trust?.score) >= 96.2 &&
           (d.dsse?.current || d.dsse?.coverage) === 100);
console.log(ok ? "✅ READY for canary" : "⏸️ NOT READY - conditions not met");
' 2>/dev/null || echo "Unable to check"
echo ""

echo "=========================="
echo "✅ Verification complete!"
echo ""
echo "Next actions:"
echo "1. If gate is GREEN: EXPAND_MODE=canary make expand-lite-auto"
echo "2. Monitor: make turbo-dashboard"
echo "3. Emergency: make contract-lite or make loa3-demote"
echo "=========================="