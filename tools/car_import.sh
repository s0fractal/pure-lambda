#!/bin/bash
# Import CAR bundle into local IPFS node

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    echo "Usage: $0 <input.car>"
    echo "Import a CAR file into local IPFS"
    echo ""
    echo "Example:"
    echo "  $0 registry.car"
    exit 1
}

if [ $# -ne 1 ]; then
    usage
fi

CAR_FILE="$1"

if [ ! -f "$CAR_FILE" ]; then
    echo -e "${RED}❌ CAR file not found: $CAR_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}📥 Importing CAR bundle...${NC}"
echo "  File: $CAR_FILE"
echo "  Size: $(du -h "$CAR_FILE" | cut -f1)"

# Check IPFS daemon
if ! ipfs id &>/dev/null; then
    echo -e "${RED}❌ IPFS daemon not running${NC}"
    echo "Start with: ipfs daemon"
    exit 1
fi

# Import CAR
echo "Importing..."
if command -v ipfs-car &>/dev/null; then
    # Extract root CID first
    ROOT_CID=$(ipfs-car roots "$CAR_FILE" | head -1)
    
    # Import to IPFS
    ipfs dag import "$CAR_FILE"
else
    # Direct import
    ROOT_CID=$(ipfs dag import "$CAR_FILE" | grep -oP 'Qm[a-zA-Z0-9]+|bafy[a-zA-Z0-9]+' | head -1)
fi

if [ -z "$ROOT_CID" ]; then
    echo -e "${RED}❌ Failed to extract root CID${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CAR imported successfully${NC}"
echo "  Root CID: $ROOT_CID"

# Verify by fetching
echo ""
echo "Verifying..."
if ipfs dag get "$ROOT_CID" &>/dev/null; then
    echo -e "${GREEN}✅ Content verified${NC}"
    
    # Show structure
    echo ""
    echo "Content structure:"
    ipfs dag get "$ROOT_CID" | head -20
else
    echo -e "${RED}❌ Failed to verify content${NC}"
    exit 1
fi

echo ""
echo "To explore:"
echo "  ipfs dag get $ROOT_CID"
echo "  ipfs refs -r $ROOT_CID"