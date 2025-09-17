#!/bin/bash
# ZK Receipt Verifier

set -euo pipefail

PROOF_FILE="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[VERIFIER]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

if [[ -z "$PROOF_FILE" || ! -f "$PROOF_FILE" ]]; then
    err "Usage: $0 <proof.json>"
fi

log "Verifying proof: $PROOF_FILE"

# Parse proof
if ! jq . "$PROOF_FILE" >/dev/null 2>&1; then
    err "Invalid JSON in proof file"
fi

# Extract components
PROTOCOL=$(jq -r '.proof.protocol' "$PROOF_FILE")
ACTION_HASH=$(jq -r '.public_inputs.action_hash' "$PROOF_FILE")
DID=$(jq -r '.public_inputs.origin_did' "$PROOF_FILE")
TIMESTAMP=$(jq -r '.public_inputs.timestamp' "$PROOF_FILE")
NONCE=$(jq -r '.public_inputs.nonce' "$PROOF_FILE")

log "Protocol: $PROTOCOL"
log "Action Hash: $ACTION_HASH"
log "DID: $DID"
log "Timestamp: $TIMESTAMP"

# Verify timestamp is not too old (24 hours)
CURRENT_TIME=$(date +%s)
MAX_AGE=$((24 * 60 * 60))
AGE=$((CURRENT_TIME - TIMESTAMP))

if [[ $AGE -gt $MAX_AGE ]]; then
    err "Proof too old: ${AGE}s (max: ${MAX_AGE}s)"
fi

# Check revocation list (simulated)
REVOCATION_CHECK() {
    local did="$1"
    # In production, check against CRL on IPFS
    if [[ "$did" == "did:revoked:*" ]]; then
        return 1
    fi
    return 0
}

if ! REVOCATION_CHECK "$DID"; then
    err "DID is revoked: $DID"
fi

# Verify proof structure
PI_A=$(jq -r '.proof.pi_a | length' "$PROOF_FILE")
PI_B=$(jq -r '.proof.pi_b | length' "$PROOF_FILE")
PI_C=$(jq -r '.proof.pi_c | length' "$PROOF_FILE")

if [[ $PI_A -ne 2 || $PI_B -ne 2 || $PI_C -ne 2 ]]; then
    err "Invalid proof structure"
fi

# Pairing check (simulated - replace with actual pairing library)
PAIRING_CHECK() {
    # In production, use arkworks or similar for actual pairing
    local hash=$(echo -n "${ACTION_HASH}${DID}${TIMESTAMP}${NONCE}" | sha256sum | cut -d' ' -f1)
    local proof_hash=$(jq -r '.proof.pi_a[0]' "$PROOF_FILE" | sed 's/0x//')
    
    if [[ "${hash:0:32}" == "${proof_hash:0:32}" ]]; then
        return 0
    fi
    return 1
}

log "Performing pairing check..."
if PAIRING_CHECK; then
    echo -e "${GREEN}✓ PROOF VALID${NC}"
    
    # Generate verification receipt
    RECEIPT=$(cat <<EOF
{
  "verified": true,
  "verifier": "$(hostname)",
  "verified_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "proof_hash": "$(sha256sum "$PROOF_FILE" | cut -d' ' -f1)",
  "did": "$DID",
  "action_hash": "$ACTION_HASH"
}
EOF
)
    
    echo "$RECEIPT" | jq .
    exit 0
else
    echo -e "${RED}✗ PROOF INVALID${NC}"
    exit 1
fi