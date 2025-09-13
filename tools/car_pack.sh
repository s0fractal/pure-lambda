#!/bin/bash
# Pack CIDs into CAR bundle for offline transport

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    echo "Usage: $0 <head-cid> [output.car]"
    echo "Pack a CID and its dependencies into a CAR file"
    echo ""
    echo "Examples:"
    echo "  $0 bafyrei123... registry.car"
    echo "  $0 \$(ipfs add -q README.md)"
    exit 1
}

if [ $# -lt 1 ]; then
    usage
fi

HEAD_CID="$1"
OUTPUT="${2:-${HEAD_CID}.car}"

echo -e "${BLUE}📦 Packing CAR bundle...${NC}"
echo "  Head CID: $HEAD_CID"
echo "  Output: $OUTPUT"

# Check if IPFS is running
if ! ipfs id &>/dev/null; then
    echo -e "${RED}❌ IPFS daemon not running${NC}"
    echo "Start with: ipfs daemon"
    exit 1
fi

# Create CAR file
if command -v ipfs-car &>/dev/null; then
    # Use ipfs-car if available (npm install -g ipfs-car)
    ipfs-car create "$OUTPUT" "$HEAD_CID"
else
    # Fallback to ipfs dag export
    ipfs dag export "$HEAD_CID" > "$OUTPUT"
fi

# Verify CAR was created
if [ ! -f "$OUTPUT" ]; then
    echo -e "${RED}❌ Failed to create CAR file${NC}"
    exit 1
fi

# Get CAR size
SIZE=$(du -h "$OUTPUT" | cut -f1)

echo -e "${GREEN}✅ CAR bundle created${NC}"
echo "  Size: $SIZE"
echo ""
echo "To import on another node:"
echo "  ./car_import.sh $OUTPUT"
echo ""
echo "To verify contents:"
echo "  ipfs-car list $OUTPUT"