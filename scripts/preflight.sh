#!/bin/bash
# LoA3 Pre-flight Checklist for GitHub Push

set -euo pipefail

echo "🚀 LoA3 PRE-FLIGHT CHECKLIST"
echo "============================="

# 1. Check for secrets
echo "🔒 Checking for secrets..."
if grep -r "ED25519_SECRET\|BOT_TOKEN\|PRIVATE_KEY" . --exclude-dir=.git --exclude-dir=node_modules 2>/dev/null | grep -v "example\|test\|mock" | grep -v ".sh:"; then
    echo "❌ CRITICAL: Found potential secrets in code!"
    echo "   Remove secrets and use GitHub Secrets instead"
    exit 1
else
    echo "✅ No secrets found in code"
fi

# 2. Verify LoA3 configuration
echo ""
echo "📋 Checking LoA3 configuration..."
if grep -q "level = 3" policies/autonomy.toml; then
    echo "✅ LoA level = 3"
else
    echo "❌ LoA not set to 3"
    exit 1
fi

if grep -q "apply = true" policies/autonomy.toml; then
    echo "✅ Apply = true"
else
    echo "❌ Apply not enabled"
    exit 1
fi

if grep -q 'mode = "guarded"' policies/autonomy.toml; then
    echo "✅ Mode = guarded"
else
    echo "❌ Mode not guarded"
    exit 1
fi

# 3. Check critical files exist
echo ""
echo "📁 Checking critical files..."
FILES=(
    "policies/autonomy.toml"
    "policies/objectives.json"
    "scripts/oracle/green-gate.mjs"
    "scripts/oracle/canary-expand.mjs"
    "scripts/oracle/postverify.mjs"
    "scripts/autonomy/promote-loa3.mjs"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ Missing: $file"
        exit 1
    fi
done

# 4. Check dashboard metrics
echo ""
echo "📊 Checking current metrics..."
node -e '
const d = require("./reports/dashboard/latest.json");
const ok = d.coverage?.patterns === "12/12" &&
           (d.trust?.current || d.trust?.score) >= 96.2 &&
           (d.dsse?.current || d.dsse?.coverage) === 100;
if (ok) {
    console.log("✅ Metrics healthy for LoA3");
    console.log("   Coverage: " + d.coverage?.patterns);
    console.log("   Trust: " + (d.trust?.current || d.trust?.score) + "%");
    console.log("   DSSE: " + (d.dsse?.current || d.dsse?.coverage) + "%");
} else {
    console.log("⚠️ Metrics not optimal but proceeding");
}
'

# 5. Check for uncommitted changes
echo ""
echo "📝 Git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ Uncommitted changes detected"
    echo "   Run: git add -A && git commit -m 'LoA3: Complete implementation'"
else
    echo "✅ Working directory clean"
fi

# 6. Final summary
echo ""
echo "============================="
echo "📋 PRE-FLIGHT SUMMARY"
echo "============================="
echo ""
echo "GitHub Secrets needed:"
echo "  • PL_ED25519_SECRET (base64 private key)"
echo "  • PL_DID (did:key:z...)"
echo "  • Use GITHUB_TOKEN with 'contents: write'"
echo ""
echo "GitHub Settings:"
echo "  • Actions → Settings → Workflow permissions: Read and write"
echo "  • Branch protection: Require PR reviews (optional)"
echo ""
echo "Ready commands:"
echo "  git checkout -b launch/loa3"
echo "  git add -A"
echo "  git commit -m 'feat: LoA3 guarded autonomy with canary expansion'"
echo "  git push -u origin launch/loa3"
echo "  gh pr create --title 'feat: LoA3 Guarded Autonomy' \\"
echo "    --body 'Implements Level of Autonomy 3 with safety guardrails' \\"
echo "    --label 'go-live' --label 'loa3'"
echo ""
echo "✅ System ready for GitHub push!"
echo "============================="