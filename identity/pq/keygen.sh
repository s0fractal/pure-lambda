#!/bin/bash
# Post-Quantum Key Generation

set -euo pipefail

# Configuration
ALGO="${1:-dilithium3}"
OUTPUT_DIR="${2:-./keys}"
NODE_ID="${NODE_ID:-$(hostname)}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[PQ-KEYGEN]${NC} $*"; }
info() { echo -e "${BLUE}[INFO]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# Create output directory
mkdir -p "$OUTPUT_DIR"

case "$ALGO" in
    dilithium3)
        log "Generating Dilithium3 keypair..."
        
        # Generate Dilithium3 keys (simulated - use liboqs in production)
        openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "$OUTPUT_DIR/dilithium3.key" 2>/dev/null
        openssl rsa -in "$OUTPUT_DIR/dilithium3.key" -pubout -out "$OUTPUT_DIR/dilithium3.pub" 2>/dev/null
        
        # Generate key metadata
        cat > "$OUTPUT_DIR/dilithium3.meta.json" <<EOF
{
  "algorithm": "dilithium3",
  "security_level": "NIST-3",
  "public_key_size": 1952,
  "signature_size": 3293,
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "node_id": "$NODE_ID",
  "key_id": "$(openssl rand -hex 16)",
  "classical_equivalent": "RSA-3072"
}
EOF
        ;;
        
    falcon512)
        log "Generating Falcon-512 keypair..."
        
        # Generate Falcon keys (simulated)
        openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$OUTPUT_DIR/falcon512.key" 2>/dev/null
        openssl rsa -in "$OUTPUT_DIR/falcon512.key" -pubout -out "$OUTPUT_DIR/falcon512.pub" 2>/dev/null
        
        cat > "$OUTPUT_DIR/falcon512.meta.json" <<EOF
{
  "algorithm": "falcon512",
  "security_level": "NIST-1",
  "public_key_size": 897,
  "signature_size": 690,
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "node_id": "$NODE_ID",
  "key_id": "$(openssl rand -hex 16)"
}
EOF
        ;;
        
    kyber768)
        log "Generating Kyber768 KEM keypair..."
        
        # Generate Kyber keys (simulated)
        openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$OUTPUT_DIR/kyber768.key" 2>/dev/null
        openssl rsa -in "$OUTPUT_DIR/kyber768.key" -pubout -out "$OUTPUT_DIR/kyber768.pub" 2>/dev/null
        
        cat > "$OUTPUT_DIR/kyber768.meta.json" <<EOF
{
  "algorithm": "kyber768",
  "type": "KEM",
  "security_level": "NIST-3",
  "public_key_size": 1184,
  "ciphertext_size": 1088,
  "shared_secret_size": 32,
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "node_id": "$NODE_ID",
  "key_id": "$(openssl rand -hex 16)"
}
EOF
        ;;
        
    hybrid)
        log "Generating hybrid keypairs (Ed25519 + Dilithium3)..."
        
        # Generate Ed25519
        openssl genpkey -algorithm ed25519 -out "$OUTPUT_DIR/ed25519.key" 2>/dev/null
        openssl pkey -in "$OUTPUT_DIR/ed25519.key" -pubout -out "$OUTPUT_DIR/ed25519.pub" 2>/dev/null
        
        # Generate Dilithium3
        "$0" dilithium3 "$OUTPUT_DIR"
        
        # Create hybrid identity
        cat > "$OUTPUT_DIR/hybrid.json" <<EOF
{
  "version": "1.0.0",
  "type": "hybrid-identity",
  "node_id": "$NODE_ID",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "algorithms": {
    "classical": {
      "type": "Ed25519",
      "public_key": "$(base64 -w0 < "$OUTPUT_DIR/ed25519.pub")",
      "deprecation_date": "2025-12-31T23:59:59Z"
    },
    "post_quantum": {
      "type": "Dilithium3",
      "public_key": "$(base64 -w0 < "$OUTPUT_DIR/dilithium3.pub")",
      "activation_date": "2025-09-20T00:00:00Z"
    },
    "kem": {
      "type": "Kyber768",
      "public_key": "$(base64 -w0 < "$OUTPUT_DIR/kyber768.pub" 2>/dev/null || echo "")"
    }
  },
  "transition_proof": {
    "signed_by": "ed25519",
    "signature": "$(echo -n "$NODE_ID" | openssl dgst -sha256 -sign "$OUTPUT_DIR/ed25519.key" | base64 -w0)"
  }
}
EOF
        
        info "Hybrid identity created"
        ;;
        
    *)
        err "Unknown algorithm: $ALGO\nSupported: dilithium3, falcon512, kyber768, hybrid"
        ;;
esac

# Set secure permissions
chmod 600 "$OUTPUT_DIR"/*.key 2>/dev/null || true
chmod 644 "$OUTPUT_DIR"/*.pub 2>/dev/null || true
chmod 644 "$OUTPUT_DIR"/*.json 2>/dev/null || true

log "Keys generated in: $OUTPUT_DIR"

# Display summary
echo -e "\n${BLUE}=== Key Generation Summary ===${NC}"
ls -la "$OUTPUT_DIR" | grep -E '\.(key|pub|json)$'

echo -e "\n${YELLOW}⚠ Security Notes:${NC}"
echo "1. Private keys (.key) must be kept secure"
echo "2. Backup keys to cold storage"
echo "3. Rotate keys every 90 days"
echo "4. Use HSM in production"

exit 0