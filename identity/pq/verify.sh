#!/bin/bash
# Post-Quantum Signature Verification

set -euo pipefail

SIG_FILE="${1:-}"
MESSAGE="${2:-}"
PUB_KEY="${3:-./keys/dilithium3.pub}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[PQ-VERIFY]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

if [[ -z "$SIG_FILE" || ! -f "$SIG_FILE" ]]; then
    err "Usage: $0 <signature.json> [message|file] [public-key]"
fi

# Parse signature file
if ! jq . "$SIG_FILE" >/dev/null 2>&1; then
    err "Invalid signature file format"
fi

ALGO=$(jq -r '.algorithm // .signatures | keys[0]' "$SIG_FILE")
IS_HYBRID=$(jq -r 'has("signatures")' "$SIG_FILE")

log "Verifying $ALGO signature..."

if [[ "$IS_HYBRID" == "true" ]]; then
    # Verify hybrid signatures
    log "Hybrid signature detected, verifying both..."
    
    ED_SIG=$(jq -r '.signatures.ed25519.signature' "$SIG_FILE")
    DIL_SIG=$(jq -r '.signatures.dilithium3.signature' "$SIG_FILE")
    MSG_HASH=$(jq -r '.message_hash' "$SIG_FILE")
    
    if [[ -z "$MESSAGE" ]]; then
        err "Message required for hybrid verification"
    fi
    
    # Prepare message
    if [[ -f "$MESSAGE" ]]; then
        MESSAGE_FILE="$MESSAGE"
    else
        MESSAGE_FILE="/tmp/verify-msg-$(date +%s).txt"
        echo -n "$MESSAGE" > "$MESSAGE_FILE"
    fi
    
    # Verify message hash
    ACTUAL_HASH=$(sha256sum "$MESSAGE_FILE" | cut -d' ' -f1)
    if [[ "$MSG_HASH" != "$ACTUAL_HASH" ]]; then
        err "Message hash mismatch!"
    fi
    
    # Verify Ed25519 (if not deprecated)
    DEPRECATED=$(jq -r '.signatures.ed25519.deprecated' "$SIG_FILE")
    if [[ "$DEPRECATED" != "true" ]]; then
        echo -n "$ED_SIG" | base64 -d > /tmp/ed.sig
        if openssl dgst -sha512 -verify "./keys/ed25519.pub" -signature /tmp/ed.sig "$MESSAGE_FILE" 2>/dev/null; then
            echo -e "${GREEN}✓ Ed25519 signature valid${NC}"
        else
            echo -e "${RED}✗ Ed25519 signature invalid${NC}"
            EXIT_CODE=1
        fi
    else
        echo -e "${YELLOW}⚠ Ed25519 deprecated, skipping${NC}"
    fi
    
    # Verify Dilithium3
    echo -n "$DIL_SIG" | base64 -d > /tmp/dil.sig
    if openssl dgst -sha3-512 -verify "./keys/dilithium3.pub" -signature /tmp/dil.sig "$MESSAGE_FILE" 2>/dev/null; then
        echo -e "${GREEN}✓ Dilithium3 signature valid${NC}"
    else
        echo -e "${RED}✗ Dilithium3 signature invalid${NC}"
        EXIT_CODE=1
    fi
    
    # Overall result
    if [[ "${EXIT_CODE:-0}" -eq 0 ]]; then
        echo -e "\n${GREEN}✓ HYBRID SIGNATURE VALID${NC}"
    else
        echo -e "\n${RED}✗ HYBRID SIGNATURE INVALID${NC}"
        exit 1
    fi
    
else
    # Single signature verification
    SIGNATURE=$(jq -r '.signature' "$SIG_FILE")
    MSG_HASH=$(jq -r '.message_hash' "$SIG_FILE")
    
    if [[ -z "$MESSAGE" ]]; then
        log "Using message hash from signature file"
        MESSAGE_FILE="/tmp/verify-hash-$(date +%s).txt"
        echo -n "$MSG_HASH" > "$MESSAGE_FILE"
    elif [[ -f "$MESSAGE" ]]; then
        MESSAGE_FILE="$MESSAGE"
        # Verify hash
        ACTUAL_HASH=$(sha256sum "$MESSAGE_FILE" | cut -d' ' -f1)
        if [[ "$MSG_HASH" != "$ACTUAL_HASH" ]]; then
            err "Message hash mismatch!"
        fi
    else
        MESSAGE_FILE="/tmp/verify-msg-$(date +%s).txt"
        echo -n "$MESSAGE" > "$MESSAGE_FILE"
    fi
    
    # Decode signature
    echo -n "$SIGNATURE" | base64 -d > /tmp/sig.bin
    
    # Verify based on algorithm
    case "$ALGO" in
        dilithium3)
            HASH_ALG="-sha3-512"
            ;;
        falcon512)
            HASH_ALG="-sha256"
            ;;
        ed25519)
            HASH_ALG="-sha512"
            ;;
        *)
            err "Unknown algorithm: $ALGO"
            ;;
    esac
    
    if openssl dgst $HASH_ALG -verify "$PUB_KEY" -signature /tmp/sig.bin "$MESSAGE_FILE" 2>/dev/null; then
        echo -e "${GREEN}✓ SIGNATURE VALID${NC}"
        
        # Display verification receipt
        cat > /tmp/verification-receipt.json <<EOF
{
  "verified": true,
  "algorithm": "$ALGO",
  "signature_file": "$SIG_FILE",
  "public_key": "$PUB_KEY",
  "message_hash": "$MSG_HASH",
  "verified_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "quantum_resistant": $([ "$ALGO" = "ed25519" ] && echo "false" || echo "true")
}
EOF
        
        log "Verification receipt: /tmp/verification-receipt.json"
        exit 0
    else
        echo -e "${RED}✗ SIGNATURE INVALID${NC}"
        exit 1
    fi
fi

# Clean up
rm -f /tmp/ed.sig /tmp/dil.sig /tmp/sig.bin /tmp/verify-*.txt 2>/dev/null || true

exit ${EXIT_CODE:-0}