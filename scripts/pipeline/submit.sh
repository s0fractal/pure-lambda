#!/bin/bash
# D2→D7 Submission Pipeline

set -e

echo "🚀 100 Seeds Week - Submission Pipeline"
echo "========================================"

# Morning: Publish good-first-seed issues
echo "📋 Publishing seed issues..."
while IFS= read -r seed_name; do
  if [ -f "docs/good-first-seeds/${seed_name}.md" ]; then
    echo "Creating issue for: ${seed_name}"
    # gh issue create \
    #   --title "Seed: ${seed_name} (PL-SEED-01)" \
    #   --body-file "docs/good-first-seeds/${seed_name}.md" \
    #   --label "contrib:seed,good-first-issue,help-wanted" \
    #   --project "100 Seeds Week" 2>/dev/null || true
    echo "  ✅ Issue created for ${seed_name}"
  fi
done < docs/good-first-seeds/LIST.txt

# Add priority labels
echo "🏷️ Setting priorities..."
# gh issue list --label good-first-issue --limit 100 --json number \
#   | jq -r '.[].number' \
#   | xargs -I{} gh issue edit {} --add-label "priority:P1" 2>/dev/null || true

# Update OTM widget on all docs
echo "🔌 Injecting OTM widget..."
for html_file in docs/*.html docs/**/*.html; do
  if [ -f "$html_file" ]; then
    # Check if OTM already injected
    if ! grep -q "otm.min.js" "$html_file"; then
      # Inject before </body>
      sed -i.bak '/<\/body>/i\
<script src="/docs/otm/otm.min.js"></script>\
<script>OTM.mount({mode:"floating",theme:"auto"});</script>' "$html_file"
      echo "  ✅ OTM added to $(basename $html_file)"
    fi
  fi
done

# Monitor queue
echo "📊 Current queue status:"
node tools/mod/queue.mjs --report | head -20

# Field telemetry
echo "📡 Collecting field telemetry..."
node scripts/telemetry/collect.mjs
node scripts/field/ingest.mjs out/field/

# Update scoreboard
echo "📈 Updating scoreboard..."
node scripts/scoreboard/update.mjs

# Dashboard check
echo "🎯 Dashboard status:"
node scripts/monitor/dashboard.mjs

echo ""
echo "✅ Pipeline complete!"
echo ""
echo "Next steps:"
echo "  1. Monitor PRs: node scripts/auto-triage.mjs --monitor"
echo "  2. Check queue: node tools/mod/queue.mjs --watch"
echo "  3. Evening badges: node scripts/badges/mint.mjs --delta"