#!/usr/bin/env bash
# Silence Gate - CI verification that silence is respected
set -euo pipefail

TRACE="${1:-out/trace.json}"       # подія з presence.touch()/I/O
POLICY="${2:-policies/silence.yaml}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check for writes in trace
jq -e '.[].event | select(.type=="write")' "$TRACE" >/dev/null 2>&1 && HAS_WRITES=1 || HAS_WRITES=0

# Get last touch timestamp
LAST_TOUCH_TS=$(jq -r '.[].event | select(.type=="touch") | .ts' "$TRACE" 2>/dev/null | tail -n1 || echo "")

# Current time in milliseconds (macOS compatible)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS doesn't support %N, use python
    NOW_MS=$(python3 -c 'import time; print(int(time.time() * 1000))')
else
    NOW_MS=$(date +%s%3N)
fi

# Get silence threshold from policy
if command -v yq &> /dev/null; then
    SILENCE_MS=$(yq '.params.silence_ms' "$POLICY")
else
    # Fallback to grep if yq not available
    SILENCE_MS=$(grep -A1 'silence_ms:' "$POLICY" | tail -1 | sed 's/[^0-9]//g')
fi

# Default to 24h if not found
SILENCE_MS="${SILENCE_MS:-86400000}"

if [[ -z "$LAST_TOUCH_TS" ]]; then
    LAST_TOUCH_TS=0
fi

DELTA=$(( NOW_MS - LAST_TOUCH_TS ))

# Convert to human readable
DELTA_HOURS=$(( DELTA / 3600000 ))
DELTA_MINS=$(( (DELTA % 3600000) / 60000 ))

# Invariant check: у тиші — жодних побічних ефектів
if (( DELTA > SILENCE_MS )) && (( HAS_WRITES == 1 )); then
    echo -e "${RED}❌ silence_gate: writes detected in silence window${NC}"
    echo -e "   Time since last touch: ${DELTA_HOURS}h ${DELTA_MINS}m (${DELTA}ms)"
    echo -e "   Silence threshold: $(( SILENCE_MS / 3600000 ))h (${SILENCE_MS}ms)"
    echo -e "   Writes detected: YES"
    echo -e "${YELLOW}   Invariant violated: presence.silence_is_pause${NC}"
    exit 1
fi

# Success cases
if (( DELTA > SILENCE_MS )); then
    echo -e "${GREEN}✅ silence_gate: OK (in silence)${NC}"
    echo -e "   Time in silence: ${DELTA_HOURS}h ${DELTA_MINS}m"
    echo -e "   Writes: None"
    echo -e "   Status: System respecting pause"
else
    echo -e "${GREEN}✅ silence_gate: OK (active)${NC}"
    echo -e "   Last touch: ${DELTA_MINS}m ago"
    echo -e "   Writes: $([ $HAS_WRITES -eq 1 ] && echo "Allowed" || echo "None")"
    echo -e "   Status: Within active window"
fi

# Optional: log to metrics
if [ -f "/tmp/silence_metrics.json" ]; then
    jq ". + [{\"ts\": $NOW_MS, \"delta\": $DELTA, \"writes\": $HAS_WRITES}]" \
        /tmp/silence_metrics.json > /tmp/silence_metrics.tmp && \
        mv /tmp/silence_metrics.tmp /tmp/silence_metrics.json
else
    echo "[{\"ts\": $NOW_MS, \"delta\": $DELTA, \"writes\": $HAS_WRITES}]" > /tmp/silence_metrics.json
fi

exit 0