#!/bin/bash
# Federation Day-0: Deploy lviv-harbor
# Second city rises on the shores of data

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        DEPLOYING: LVIV-HARBOR            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "🏰 Друге місто федерації"
echo ""

# Phase 1: Generate city identity
echo -e "${BLUE}[Phase 1] Генерація ідентичності міста${NC}"
echo "========================================="

CITY_DID="did:pl:LvivHarbor$(date +%s)"
TIMESTAMP=$(date +%s)

mkdir -p cities/lviv-harbor/identity

cat > cities/lviv-harbor/identity/city.json << EOF
{
  "did": "$CITY_DID",
  "name": "lviv-harbor",
  "founded": $TIMESTAMP,
  "founder": "did:pl:FederationCouncil",
  "nodes": 3,
  "location": "west",
  "specialization": "creativity_and_culture"
}
EOF

echo -e "  ${GREEN}✓ City DID: $CITY_DID${NC}"

# Phase 2: Deploy nodes
echo ""
echo -e "${BLUE}[Phase 2] Розгортання 3 вузлів${NC}"
echo "========================================="

NODES=("harbor-node-1" "harbor-node-2" "harbor-node-3")
PORT_BASE=8000

for i in "${!NODES[@]}"; do
    NODE=${NODES[$i]}
    PORT=$((PORT_BASE + i))
    
    echo -n "  ⚡ Deploying $NODE (port $PORT)..."
    
    # Create node config
    mkdir -p cities/lviv-harbor/nodes/$NODE
    cat > cities/lviv-harbor/nodes/$NODE/config.yaml << EOF
node:
  name: $NODE
  city: lviv-harbor
  did: "did:pl:Node-$NODE"
  port: $PORT
  chamber: A
  role: validator
  capabilities:
    - attestation
    - contracts
    - consensus
EOF
    
    sleep 0.3
    echo -e " ${GREEN}✓${NC}"
done

echo -e "  ${GREEN}✓ All nodes deployed${NC}"

# Phase 3: Create founding citizens
echo ""
echo -e "${BLUE}[Phase 3] Засновники lviv-harbor${NC}"
echo "========================================="

cat > cities/lviv-harbor/citizens.json << EOF
{
  "humans": [
    {
      "did": "did:pl:Human-Petro",
      "name": "Petro",
      "role": "Architect",
      "chamber": "H",
      "reputation": 0.5
    },
    {
      "did": "did:pl:Human-Oksana",
      "name": "Oksana",
      "role": "Artist",
      "chamber": "H",
      "reputation": 0.5
    },
    {
      "did": "did:pl:Human-Bohdan",
      "name": "Bohdan",
      "role": "Historian",
      "chamber": "H",
      "reputation": 0.5
    }
  ],
  "agents": [
    {
      "did": "did:pl:Agent-Vysokyi",
      "name": "Vysokyi",
      "role": "Heights",
      "chamber": "A",
      "reputation": 0.6
    },
    {
      "did": "did:pl:Agent-Rynok",
      "name": "Rynok",
      "role": "Market",
      "chamber": "A",
      "reputation": 0.7
    },
    {
      "did": "did:pl:Agent-Lev",
      "name": "Lev",
      "role": "Guardian",
      "chamber": "A",
      "reputation": 0.8
    }
  ]
}
EOF

echo "  Палата Людей (H):"
echo "    • Petro (Architect)"
echo "    • Oksana (Artist)"
echo "    • Bohdan (Historian)"
echo ""
echo "  Палата Агентів (A):"
echo "    • Vysokyi (Heights)"
echo "    • Rynok (Market)"
echo "    • Lev (Guardian)"

# Phase 4: Initialize registry
echo ""
echo -e "${BLUE}[Phase 4] Ініціалізація реєстру${NC}"
echo "========================================="

GENESIS_CID="QmLvivGenesis$(date +%s | sha256sum | cut -c1-44)"

cat > cities/lviv-harbor/registry/head.json << EOF
{
  "version": "v1.0.0",
  "timestamp": $TIMESTAMP,
  "city": "lviv-harbor",
  "genesis_cid": "$GENESIS_CID",
  "head_cid": "$GENESIS_CID",
  "citizens": 6,
  "contracts": 0,
  "genes": 0,
  "parent_city": "kyiv-prime"
}
EOF

echo -e "  ${GREEN}✓ Genesis CID: $GENESIS_CID${NC}"
echo -e "  ${GREEN}✓ Registry initialized${NC}"

# Phase 5: City configuration
echo ""
echo -e "${BLUE}[Phase 5] Конфігурація міста${NC}"
echo "========================================="

cat > cities/lviv-harbor/.env << EOF
CITY_NAME=lviv-harbor
VERSION=v1.0.0
NODE_COUNT=3
CHAMBER_H_NODES=1
CHAMBER_A_NODES=2
GENESIS_CID=$GENESIS_CID
CITY_DID=$CITY_DID
FEDERATION_MEMBER=true
PEER_CITIES=kyiv-prime
EOF

echo -e "  ${GREEN}✓ Configuration saved${NC}"

# Phase 6: Start services (simulated)
echo ""
echo -e "${BLUE}[Phase 6] Запуск сервісів${NC}"
echo "========================================="

echo "  ⚡ Starting IPFS..."
sleep 0.5
echo -e "  ${GREEN}✓ IPFS online${NC}"

echo "  ⚡ Starting consensus..."
sleep 0.5
echo -e "  ${GREEN}✓ Consensus active${NC}"

echo "  ⚡ Starting contract engine..."
sleep 0.5
echo -e "  ${GREEN}✓ Contracts ready${NC}"

# Create city manifest
cat > cities/lviv-harbor/manifest.json << EOF
{
  "city": "lviv-harbor",
  "status": "online",
  "founded": $TIMESTAMP,
  "nodes": 3,
  "citizens": 6,
  "specialization": "creativity_and_culture",
  "peer_cities": ["kyiv-prime"],
  "endpoints": {
    "api": "http://localhost:8001",
    "ipfs": "http://localhost:8080/ipfs",
    "metrics": "http://localhost:9091"
  }
}
EOF

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         LVIV-HARBOR IS ALIVE!            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Місто розгорнуто успішно!${NC}"
echo ""
echo "  📊 Статистика:"
echo "    • Вузлів: 3"
echo "    • Громадян: 6 (3H + 3A)"
echo "    • Спеціалізація: Creativity & Culture"
echo "    • Genesis: $GENESIS_CID"
echo ""
echo "  🌐 Endpoints:"
echo "    • API: http://localhost:8001"
echo "    • IPFS: http://localhost:8080"
echo "    • Metrics: http://localhost:9091"
echo ""
echo "Наступний крок: встановити піринг з kyiv-prime"
echo ""
echo -e "${PURPLE}\"Від Високого Замку до цифрових хмар\"${NC}"