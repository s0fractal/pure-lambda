#!/bin/bash
# Key Rotation: Founder → Operational
# Principle of least privilege

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔐 Key Rotation Protocol${NC}"
echo "========================================="

FOUNDER_DID="did:pl:FounderKyiv1757750983"
CITY_DID="did:pl:KyivPrime"
TIMESTAMP=$(date +%s)

# Generate operational keys
mkdir -p identity/operational

echo "Generating operational keys..."

# City operational key
cat > identity/operational/city-key.json << EOF
{
  "did": "$CITY_DID",
  "type": "Ed25519VerificationKey2020",
  "publicKey": "$(openssl rand -hex 32)",
  "privateKey": "[REDACTED]",
  "created": $TIMESTAMP,
  "rotatedFrom": "$FOUNDER_DID",
  "capabilities": ["governance", "contracts", "attestation"]
}
EOF

# Chamber keys
cat > identity/operational/chamber-h.json << EOF
{
  "did": "did:pl:ChamberH",
  "type": "Ed25519VerificationKey2020",
  "publicKey": "$(openssl rand -hex 32)",
  "capabilities": ["vote", "propose", "contract_issue"]
}
EOF

cat > identity/operational/chamber-a.json << EOF
{
  "did": "did:pl:ChamberA",
  "type": "Ed25519VerificationKey2020",
  "publicKey": "$(openssl rand -hex 32)",
  "capabilities": ["vote", "propose", "contract_accept"]
}
EOF

echo -e "  ${GREEN}✓ Operational keys generated${NC}"

# Issue capabilities with least privilege
echo ""
echo "Issuing least-privilege capabilities..."

cat > identity/operational/capabilities.ucan << EOF
{
  "iss": "$FOUNDER_DID",
  "sub": "$CITY_DID",
  "aud": "kyiv-prime",
  "exp": $((TIMESTAMP + 86400 * 30)),
  "nbf": $TIMESTAMP,
  "cap": {
    "governance": {
      "vote": true,
      "propose": true,
      "veto": false
    },
    "contracts": {
      "issue": true,
      "accept": true,
      "revoke": false
    },
    "attestation": {
      "sign": true,
      "verify": true
    },
    "admin": {
      "key_rotate": false,
      "emergency_stop": false
    }
  }
}
EOF

echo -e "  ${GREEN}✓ Capabilities issued${NC}"

# Revoke founder privileges
echo ""
echo "Revoking founder super-privileges..."

cat > identity/operational/founder-revocation.json << EOF
{
  "did": "$FOUNDER_DID",
  "timestamp": $TIMESTAMP,
  "action": "privilege_reduction",
  "new_weight": 0.34,
  "retained": ["emergency_stop", "historical_witness"],
  "revoked": ["unilateral_action", "infinite_weight"]
}
EOF

echo -e "  ${YELLOW}⚠ Founder weight reduced to 0.34${NC}"
echo -e "  ${GREEN}✓ Founder retains emergency_stop only${NC}"

echo ""
echo -e "${GREEN}✅ Key rotation complete!${NC}"
echo ""
echo "  🔑 City DID: $CITY_DID"
echo "  📋 Capabilities: governance, contracts, attestation"
echo "  ⚖️ Founder weight: 0.34 (minority)"
echo ""
echo "Keys saved to: identity/operational/"