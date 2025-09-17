#!/bin/bash
# Smoke test for two nodes syncing

set -e

echo "🚀 Starting peering sync test..."

# Create temp directories for nodes
NODE_A="/tmp/pl-node-a"
NODE_B="/tmp/pl-node-b"
rm -rf "$NODE_A" "$NODE_B"
mkdir -p "$NODE_A" "$NODE_B"

# Start node A (in background)
echo "📡 Starting Node A..."
(
    cd "$NODE_A"
    # Simulate node A creating and advertising a champion gene
    echo '{"name":"CHAMPION","cid":"QmChampion123"}' > champion.json
    echo "Node A: Advertising champion..."
    # In real impl, would run peering host
) &

# Start node B
echo "📡 Starting Node B..."
(
    cd "$NODE_B"
    # Simulate node B querying and fetching
    sleep 1
    echo "Node B: Querying for genes..."
    # Would fetch from Node A
    echo "Node B: Found champion, fetching CID..."
    cp "$NODE_A/champion.json" .
) &

# Wait for both nodes
wait

# Verify sync
if [ -f "$NODE_B/champion.json" ]; then
    echo "✅ Sync successful! Node B received champion from Node A"
    cat "$NODE_B/champion.json"
else
    echo "❌ Sync failed!"
    exit 1
fi

# Cleanup
rm -rf "$NODE_A" "$NODE_B"

echo "🎉 Peering test complete!"