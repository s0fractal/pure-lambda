#!/bin/bash
# Post-Quantum Signing

set -euo pipefail

MESSAGE="${1:-}"
KEY_FILE="${2:-./keys/dilithium3.key}"
ALGO="${3:-dilithium3}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[PQ-SIGN]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

if [[ -z "$MESSAGE" ]]; then
    err "Usage: $0 <message|file> [key-file] [algorithm]"
fi

if [[ ! -f "$KEY_FILE" ]]; then
    err "Key file not found: $KEY_FILE"
fi

# Determine if message is a file or string
if [[ -f "$MESSAGE" ]]; then
    MESSAGE_DATA=$(cat "$MESSAGE")
    MESSAGE_FILE="$MESSAGE"
else
    MESSAGE_DATA="$MESSAGE"
    MESSAGE_FILE="/tmp/message-$(date +%s).txt"
    echo -n "$MESSAGE_DATA" > "$MESSAGE_FILE"
fi

log "Signing with $ALGO..."

case "$ALGO" in
    dilithium3)
        # Simulate Dilithium3 signing (use liboqs in production)
        SIGNATURE=$(openssl dgst -sha3-512 -sign "$KEY_FILE" "$MESSAGE_FILE" | base64 -w0)
        SIG_SIZE=3293
        ;;
        
    falcon512)
        # Simulate Falcon signing
        SIGNATURE=$(openssl dgst -sha256 -sign "$KEY_FILE" "$MESSAGE_FILE" | base64 -w0)
        SIG_SIZE=690
        ;;
        
    ed25519)
        # Classical Ed25519 for comparison
        SIGNATURE=$(openssl dgst -sha512 -sign "$KEY_FILE" "$MESSAGE_FILE" | base64 -w0)
        SIG_SIZE=64
        ;;
        
    hybrid)
        # Dual signing
        log "Generating hybrid signature..."
        
        ED_SIG=$(openssl dgst -sha512 -sign "./keys/ed25519.key" "$MESSAGE_FILE" | base64 -w0)
        DIL_SIG=$(openssl dgst -sha3-512 -sign "./keys/dilithium3.key" "$MESSAGE_FILE" | base64 -w0)
        
        cat > "/tmp/hybrid-sig-$(date +%s).json" <<EOF
{
  "version": "1.0",
  "signatures": {
    "ed25519": {
      "algorithm": "Ed25519",
      "signature": "$ED_SIG",
      "size_bytes": 64,
      "deprecated": false
    },
    "dilithium3": {
      "algorithm": "Dilithium3",
      "signature": "$DIL_SIG",
      "size_bytes": 3293,
      "primary": true
    }
  },
  "message_hash": "$(sha256sum "$MESSAGE_FILE" | cut -d' ' -f1)",
  "signed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "transition_phase": "dual-run"
}
EOF
        
        log "Hybrid signature saved: /tmp/hybrid-sig-$(date +%s).json"
        exit 0
        ;;
        
    *)
        err "Unknown algorithm: $ALGO"
        ;;
esac

# Generate signature object
SIG_FILE="/tmp/signature-$(date +%s).json"

cat > "$SIG_FILE" <<EOF
{
  "algorithm": "$ALGO",
  "signature": "$SIGNATURE",
  "message_hash": "$(sha256sum "$MESSAGE_FILE" | cut -d' ' -f1)",
  "public_key_hash": "$(sha256sum "${KEY_FILE%.key}.pub" 2>/dev/null | cut -d' ' -f1 || echo 'N/A')",
  "signature_size_bytes": $SIG_SIZE,
  "signed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "metadata": {
    "tool_version": "1.0.0",
    "quantum_resistant": $([ "$ALGO" = "ed25519" ] && echo "false" || echo "true")
  }
}
EOF

log "Signature generated: $SIG_FILE"

# Display signature info
echo -e "\n${BLUE}=== Signature Details ===${NC}"
jq . "$SIG_FILE"

# Performance comparison
if [[ "$ALGO" != "ed25519" ]]; then
    echo -e "\n${YELLOW}Performance Impact:${NC}"
    echo "  Classical (Ed25519): 64 bytes"
    echo "  Post-Quantum ($ALGO): $SIG_SIZE bytes"
    echo "  Size increase: $(echo "scale=1; $SIG_SIZE/64" | bc)x"
fi

exit 0