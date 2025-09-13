#!/bin/bash
# Tally votes for an RFC and generate governance receipt

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
    echo "Usage: $0 <rfc-id>"
    echo "Tally votes and generate governance receipt"
    echo ""
    echo "Example:"
    echo "  $0 12"
    exit 1
}

if [ $# -ne 1 ]; then
    usage
fi

RFC_ID="$1"
RFC_FILE="governance/rfc/${RFC_ID}.md"
BALLOT_FILE="governance/ballots/rfc-${RFC_ID}.jsonl"
RECEIPT_FILE="governance/receipts/rfc-${RFC_ID}.receipt.json"

if [ ! -f "$RFC_FILE" ]; then
    echo -e "${RED}❌ RFC file not found: $RFC_FILE${NC}"
    exit 1
fi

if [ ! -f "$BALLOT_FILE" ]; then
    echo -e "${YELLOW}⚠️ No ballots found, creating empty file${NC}"
    touch "$BALLOT_FILE"
fi

echo -e "${BLUE}📊 Tallying votes for RFC ${RFC_ID}${NC}"

# Parse RFC metadata (simplified - would use proper YAML parser)
TITLE=$(grep "^title:" "$RFC_FILE" | cut -d'"' -f2)
echo "  Title: $TITLE"

# Count votes (simplified - would verify signatures)
H_YES=0
H_NO=0
H_TOTAL=0
H_WEIGHT=0

A_YES=0
A_NO=0
A_TOTAL=0
A_WEIGHT=0

while IFS= read -r line; do
    if [ -z "$line" ]; then continue; fi
    
    # Parse JSON (simplified - would use jq)
    if echo "$line" | grep -q '"chamber":"H"'; then
        H_TOTAL=$((H_TOTAL + 1))
        if echo "$line" | grep -q '"vote":"yes"'; then
            H_YES=$((H_YES + 1))
        elif echo "$line" | grep -q '"vote":"no"'; then
            H_NO=$((H_NO + 1))
        fi
        # Extract weight (simplified)
        WEIGHT=$(echo "$line" | grep -oP '"weight":\K[0-9.]+' || echo "0.5")
        H_WEIGHT=$(echo "$H_WEIGHT + $WEIGHT" | bc)
    elif echo "$line" | grep -q '"chamber":"A"'; then
        A_TOTAL=$((A_TOTAL + 1))
        if echo "$line" | grep -q '"vote":"yes"'; then
            A_YES=$((A_YES + 1))
        elif echo "$line" | grep -q '"vote":"no"'; then
            A_NO=$((A_NO + 1))
        fi
        WEIGHT=$(echo "$line" | grep -oP '"weight":\K[0-9.]+' || echo "0.5")
        A_WEIGHT=$(echo "$A_WEIGHT + $WEIGHT" | bc)
    fi
done < "$BALLOT_FILE"

# Calculate percentages (with protection against division by zero)
if [ "$H_TOTAL" -gt 0 ]; then
    H_YES_PCT=$(echo "scale=2; $H_YES * 100 / $H_TOTAL" | bc)
    H_QUORUM=$(echo "scale=2; $H_WEIGHT / 10" | bc)  # Simplified
else
    H_YES_PCT=0
    H_QUORUM=0
fi

if [ "$A_TOTAL" -gt 0 ]; then
    A_YES_PCT=$(echo "scale=2; $A_YES * 100 / $A_TOTAL" | bc)
    A_QUORUM=$(echo "scale=2; $A_WEIGHT / 10" | bc)  # Simplified
else
    A_YES_PCT=0
    A_QUORUM=0
fi

# Determine result (using default thresholds)
QUORUM_THRESHOLD=0.34
YES_THRESHOLD=67

RESULT="rejected"
if (( $(echo "$H_QUORUM >= $QUORUM_THRESHOLD" | bc -l) )) && \
   (( $(echo "$A_QUORUM >= $QUORUM_THRESHOLD" | bc -l) )) && \
   (( $(echo "$H_YES_PCT >= $YES_THRESHOLD" | bc -l) )) && \
   (( $(echo "$A_YES_PCT >= $YES_THRESHOLD" | bc -l) )); then
    RESULT="accepted"
fi

# Display results
echo ""
echo "Human Chamber (H):"
echo "  Votes: $H_YES yes, $H_NO no (of $H_TOTAL)"
echo "  Yes: ${H_YES_PCT}%"
echo "  Quorum: ${H_QUORUM}"

echo ""
echo "Agent Chamber (A):"
echo "  Votes: $A_YES yes, $A_NO no (of $A_TOTAL)"
echo "  Yes: ${A_YES_PCT}%"
echo "  Quorum: ${A_QUORUM}"

echo ""
if [ "$RESULT" = "accepted" ]; then
    echo -e "${GREEN}✅ RFC ${RFC_ID} ACCEPTED${NC}"
else
    echo -e "${RED}❌ RFC ${RFC_ID} REJECTED${NC}"
fi

# Generate receipt
cat > "$RECEIPT_FILE" << EOF
{
  "rfc": ${RFC_ID},
  "title": "${TITLE}",
  "result": "${RESULT}",
  "tally": {
    "H": {
      "yes": ${H_YES_PCT},
      "no": $(echo "100 - $H_YES_PCT" | bc),
      "quorum": ${H_QUORUM},
      "total_votes": ${H_TOTAL}
    },
    "A": {
      "yes": ${A_YES_PCT},
      "no": $(echo "100 - $A_YES_PCT" | bc),
      "quorum": ${A_QUORUM},
      "total_votes": ${A_TOTAL}
    }
  },
  "timestamp": $(date +%s),
  "applied": [],
  "signatures": [
    {
      "did": "did:pl:GovService",
      "sig": "$(echo -n "$RESULT$RFC_ID" | openssl dgst -sha256 | cut -d' ' -f2)",
      "timestamp": $(date +%s)
    }
  ]
}
EOF

echo ""
echo "Receipt saved to: $RECEIPT_FILE"

# If accepted, apply changes (simplified)
if [ "$RESULT" = "accepted" ]; then
    echo ""
    echo -e "${BLUE}📝 Applying changes...${NC}"
    # Would parse payload and apply file changes
    echo "  (Changes would be applied here)"
fi