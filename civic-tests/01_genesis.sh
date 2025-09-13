#!/bin/bash
# Civic Test 01: Genesis Sync Verification

set -e

echo "🧪 Civic Test 01: Genesis Sync"
echo "=============================="
echo ""

# Check for Genesis bundle
if [ -z "$GENESIS_CAR" ]; then
    GENESIS_CAR="GENESIS-v1.0.0.car"
fi

if [ ! -f "$GENESIS_CAR" ]; then
    echo "❌ Genesis bundle not found: $GENESIS_CAR"
    echo "   Run: make genesis"
    exit 1
fi

echo "📦 Genesis bundle: $GENESIS_CAR"

# Start test node
echo "🚀 Starting test node..."
TEST_DIR="/tmp/civic-test-01-$(date +%s)"
mkdir -p "$TEST_DIR"

# Initialize IPFS
export IPFS_PATH="$TEST_DIR/.ipfs"
ipfs init --profile=test >/dev/null 2>&1
ipfs daemon --offline >/dev/null 2>&1 &
IPFS_PID=$!
sleep 3

# Import Genesis
echo "📥 Importing Genesis bundle..."
ipfs dag import "$GENESIS_CAR" >/dev/null 2>&1
GENESIS_CID=$(ipfs dag import "$GENESIS_CAR" 2>/dev/null | grep -oP 'Qm[a-zA-Z0-9]+|bafy[a-zA-Z0-9]+' | head -1)

echo "   CID: $GENESIS_CID"

# Verify critical artifacts
echo ""
echo "🔍 Verifying artifacts..."

# Check Constitution
echo -n "  Constitution: "
if ipfs cat "$GENESIS_CID" 2>/dev/null | grep -q "constitution"; then
    echo "✅"
else
    echo "❌"
    FAILED=1
fi

# Check Policies
echo -n "  Policies: "
if ipfs cat "$GENESIS_CID" 2>/dev/null | grep -q "policies"; then
    echo "✅"
else
    echo "❌"
    FAILED=1
fi

# Check Registry
echo -n "  Registry: "
if ipfs cat "$GENESIS_CID" 2>/dev/null | grep -q "champions"; then
    echo "✅"
else
    echo "❌"
    FAILED=1
fi

# Check Chronicle
echo -n "  Chronicle: "
if ipfs cat "$GENESIS_CID" 2>/dev/null | grep -q "chronicle"; then
    echo "✅"
else
    echo "❌"
    FAILED=1
fi

# Cleanup
kill $IPFS_PID 2>/dev/null || true
rm -rf "$TEST_DIR"

# Result
echo ""
if [ -z "$FAILED" ]; then
    echo "✅ PASSED: Genesis sync successful"
    exit 0
else
    echo "❌ FAILED: Genesis sync incomplete"
    exit 1
fi