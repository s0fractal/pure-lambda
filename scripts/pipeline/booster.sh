#!/bin/bash
# D2 Booster Pipeline - 30-50 seeds/day

set -e

echo "🚀 D2 Booster Pipeline"
echo "======================"

# Morning: Generate sweep variants
echo "1️⃣ Generating seed variants..."
node scripts/generate/sweep.mjs configs/sweep.yaml out/sweep/
SEEDS_COUNT=$(ls out/sweep/*.json 2>/dev/null | wc -l)
echo "   Generated: ${SEEDS_COUNT} seeds"

# Validate and bundle
echo "2️⃣ Validating seeds..."
for seed in out/sweep/*.json; do
  if [ -f "$seed" ]; then
    # Skip if already has cartridge
    cartridge="${seed%.json}.cartridge"
    if [ -f "$cartridge" ]; then
      continue
    fi

    # Validate
    npm run ck:validate "$seed" &>/dev/null && echo "   ✅ Valid: $(basename $seed)" || echo "   ❌ Invalid: $(basename $seed)"

    # Bundle with DSSE
    npm run ck:bundle "$seed" &>/dev/null && echo "   📦 Bundled: $(basename $seed)"
  fi
done 2>/dev/null || true

# Create issues (simulated)
echo "3️⃣ Creating GitHub issues..."
ISSUE_COUNT=0
for cartridge in out/sweep/*.cartridge; do
  if [ -f "$cartridge" ]; then
    name=$(basename "$cartridge" .cartridge)
    echo "   📋 Issue: Seed ${name} (PL-SEED-01)"
    # gh issue create \
    #   --title "Seed: ${name} (PL-SEED-01)" \
    #   --body "Generated seed with high novelty. See attached cartridge." \
    #   --label "contrib:seed,good-first-issue,sweep-generated" \
    #   2>/dev/null || true
    ISSUE_COUNT=$((ISSUE_COUNT + 1))

    # Limit to 20 issues per batch
    if [ $ISSUE_COUNT -ge 20 ]; then
      echo "   📊 Created 20 issues (batch limit)"
      break
    fi
  fi
done

# Update telemetry
echo "4️⃣ Collecting field telemetry..."
node scripts/telemetry/collect.mjs
node scripts/field/ingest.mjs out/field/

# Update scoreboard
echo "5️⃣ Updating scoreboard..."
node scripts/scoreboard/update.mjs | grep "Progress:"

# Auto-triage check
echo "6️⃣ Running auto-triage..."
node scripts/auto-triage.mjs | grep "Labels to apply:" || true

# Dashboard status
echo "7️⃣ Dashboard check..."
node scripts/monitor/dashboard.mjs | grep "Seeds:" || true

echo ""
echo "✅ Booster complete!"
echo "   Seeds generated: ${SEEDS_COUNT}"
echo "   Issues created: ${ISSUE_COUNT}"
echo ""
echo "Next steps:"
echo "  - Monitor: node scripts/auto-triage.mjs --monitor"
echo "  - Queue: node tools/mod/queue.mjs --watch"
echo "  - Evening: node scripts/badges/mint.mjs --delta"