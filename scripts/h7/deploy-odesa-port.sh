#!/bin/bash
# H7: Deploy odesa-port - Third city of the federation
# Maritime gateway of data

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         DEPLOYING: ODESA-PORT            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "⚓ Морська брама федерації"
echo ""

# Generate city identity
CITY_DID="did:pl:OdesaPort$(date +%s)"
TIMESTAMP=$(date +%s)

mkdir -p cities/odesa-port/{identity,nodes,registry}

cat > cities/odesa-port/identity/city.json << EOF
{
  "did": "$CITY_DID",
  "name": "odesa-port",
  "founded": $TIMESTAMP,
  "nodes": 4,
  "location": "south",
  "specialization": "trade_and_exchange"
}
EOF

echo -e "${GREEN}✓ City DID: $CITY_DID${NC}"

# Deploy 4 nodes
echo ""
echo "Deploying 4 nodes..."

NODES=("port-node-1" "port-node-2" "port-node-3" "port-node-4")
for i in "${!NODES[@]}"; do
    NODE=${NODES[$i]}
    PORT=$((9000 + i))
    
    mkdir -p cities/odesa-port/nodes/$NODE
    cat > cities/odesa-port/nodes/$NODE/config.yaml << EOF
node:
  name: $NODE
  city: odesa-port
  port: $PORT
  chamber: A
  capabilities: [attestation, contracts, consensus, sharding]
EOF
    
    echo -e "  ${GREEN}✓ $NODE (port $PORT)${NC}"
done

# Create citizens
cat > cities/odesa-port/citizens.json << EOF
{
  "humans": [
    {"did": "did:pl:Human-Mykola", "name": "Mykola", "role": "Trader", "chamber": "H"},
    {"did": "did:pl:Human-Olena", "name": "Olena", "role": "Navigator", "chamber": "H"},
    {"did": "did:pl:Human-Serhiy", "name": "Serhiy", "role": "Logistics", "chamber": "H"}
  ],
  "agents": [
    {"did": "did:pl:Agent-Potemkin", "name": "Potemkin", "role": "Strategy", "chamber": "A"},
    {"did": "did:pl:Agent-Pearl", "name": "Pearl", "role": "Exchange", "chamber": "A"},
    {"did": "did:pl:Agent-Neptune", "name": "Neptune", "role": "Maritime", "chamber": "A"}
  ]
}
EOF

echo -e "${GREEN}✓ 6 citizens created${NC}"

# Initialize registry
GENESIS_CID="QmOdesaGenesis$(date +%s | sha256sum | cut -c1-44)"

cat > cities/odesa-port/registry/head.json << EOF
{
  "version": "v1.0.0",
  "city": "odesa-port",
  "genesis_cid": "$GENESIS_CID",
  "shard_id": 2,
  "federation": ["kyiv-prime", "lviv-harbor", "odesa-port"]
}
EOF

echo -e "${GREEN}✓ Registry initialized${NC}"
echo ""
echo -e "${CYAN}✅ odesa-port is alive!${NC}"
echo "  • 4 nodes online"
echo "  • 6 citizens (3H + 3A)"
echo "  • Specialization: Trade & Exchange"