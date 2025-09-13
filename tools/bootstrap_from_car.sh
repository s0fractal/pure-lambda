#!/bin/bash
# Bootstrap civilization from time capsule

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
    echo "Usage: $0 <capsule.car>"
    echo "Bootstrap Pure Lambda from time capsule"
    echo ""
    echo "Example:"
    echo "  $0 timecapsule-20250113.car"
    exit 1
}

if [ $# -ne 1 ]; then
    usage
fi

CAPSULE="$1"

if [ ! -f "$CAPSULE" ]; then
    echo -e "${RED}❌ Capsule not found: $CAPSULE${NC}"
    exit 1
fi

echo -e "${BLUE}🌱 Bootstrapping from Time Capsule${NC}"
echo "  Capsule: $CAPSULE"
echo "  Size: $(du -h "$CAPSULE" | cut -f1)"
echo ""

# Setup fresh environment
BOOTSTRAP_DIR="/tmp/pl-bootstrap-$(date +%s)"
mkdir -p "$BOOTSTRAP_DIR"
cd "$BOOTSTRAP_DIR"

echo "📁 Creating fresh environment..."
mkdir -p {governance,registry,policies,contracts,docs}

# Initialize IPFS
echo "🌐 Initializing IPFS..."
export IPFS_PATH="$BOOTSTRAP_DIR/.ipfs"
ipfs init --profile=test
ipfs daemon --offline &
IPFS_PID=$!
sleep 5

# Import capsule
echo "📥 Importing time capsule..."
MANIFEST_CID=$(ipfs dag import "$CAPSULE" | grep -oP 'Qm[a-zA-Z0-9]+|bafy[a-zA-Z0-9]+' | head -1)
echo "  Manifest: $MANIFEST_CID"

# Extract manifest
ipfs cat "$MANIFEST_CID" > manifest.json

# Restore artifacts
echo ""
echo "🔄 Restoring artifacts..."

# Extract constitution
CONSTITUTION_CID=$(jq -r '.artifacts[] | select(.kind == "constitution") | .cid' manifest.json | head -1)
if [ -n "$CONSTITUTION_CID" ]; then
    echo "  • Constitution"
    ipfs cat "$CONSTITUTION_CID" > governance/constitution.md
fi

# Extract champion genes
echo "  • Champion genes"
jq -r '.artifacts[] | select(.kind == "champion") | .cid + " " + .name' manifest.json | while read CID NAME; do
    if [ -n "$CID" ]; then
        echo "    - $NAME"
        ipfs cat "$CID" > "registry/$NAME.json"
    fi
done

# Extract policies
echo "  • Policies"
jq -r '.artifacts[] | select(.kind == "policy") | .cid + " " + .name' manifest.json | while read CID NAME; do
    if [ -n "$CID" ]; then
        echo "    - $NAME"
        ipfs cat "$CID" > "policies/$NAME"
    fi
done

# Extract chronicle
CHRONICLE_CID=$(jq -r '.artifacts[] | select(.kind == "chronicle") | .cid' manifest.json | head -1)
if [ -n "$CHRONICLE_CID" ]; then
    echo "  • Chronicle"
    ipfs cat "$CHRONICLE_CID" > docs/chronicle.md
fi

# Verify critical files
echo ""
echo "🔍 Verifying bootstrap..."

ERRORS=0

if [ ! -f "governance/constitution.md" ]; then
    echo -e "${RED}  ✗ Constitution missing${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}  ✓ Constitution restored${NC}"
fi

GENE_COUNT=$(ls registry/*.json 2>/dev/null | wc -l)
if [ "$GENE_COUNT" -eq 0 ]; then
    echo -e "${RED}  ✗ No genes restored${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}  ✓ $GENE_COUNT genes restored${NC}"
fi

POLICY_COUNT=$(ls policies/*.yaml 2>/dev/null | wc -l)
if [ "$POLICY_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}  ⚠ No policies restored${NC}"
else
    echo -e "${GREEN}  ✓ $POLICY_COUNT policies restored${NC}"
fi

# Test network
echo ""
echo "🌐 Testing network..."

# Check if we can retrieve a CID
if ipfs cat "$MANIFEST_CID" &>/dev/null; then
    echo -e "${GREEN}  ✓ IPFS operational${NC}"
else
    echo -e "${RED}  ✗ IPFS not working${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Create bootstrap receipt
cat > bootstrap.receipt.json << EOF
{
  "capsule": "$CAPSULE",
  "manifest_cid": "$MANIFEST_CID",
  "timestamp": $(date +%s),
  "restored": {
    "constitution": $([ -f "governance/constitution.md" ] && echo "true" || echo "false"),
    "genes": $GENE_COUNT,
    "policies": $POLICY_COUNT
  },
  "errors": $ERRORS,
  "bootstrap_dir": "$BOOTSTRAP_DIR"
}
EOF

# Final report
echo ""
echo "═══════════════════════════════════"
if [ "$ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✅ BOOTSTRAP SUCCESSFUL${NC}"
    echo ""
    echo "Civilization restored in: $BOOTSTRAP_DIR"
    echo ""
    echo "Next steps:"
    echo "  1. cd $BOOTSTRAP_DIR"
    echo "  2. Start agent nodes"
    echo "  3. Resume governance"
    echo ""
    echo "🌍 The population lives again!"
else
    echo -e "${RED}❌ BOOTSTRAP FAILED${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Check bootstrap.receipt.json for details"
fi

# Keep IPFS running for inspection
echo ""
echo "IPFS daemon running (PID: $IPFS_PID)"
echo "To stop: kill $IPFS_PID"