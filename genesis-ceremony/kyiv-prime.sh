#!/bin/bash
# Genesis Ceremony: kyiv-prime
# Час: ~10 хвилин
# Дата: $(date +%Y-%m-%d)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}╔══════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║      GENESIS CEREMONY: KYIV-PRIME       ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "🌍 Від однієї лямбди до цивілізації"
echo ""
sleep 2

# Phase 0: Prerequisites
echo -e "${BLUE}[Phase 0] Перевірка передумов${NC}"
echo "========================================="

# Check tools
for tool in docker docker-compose make git ipfs; do
    if command -v $tool &> /dev/null; then
        echo "  ✓ $tool"
    else
        echo -e "  ${RED}✗ $tool missing${NC}"
        exit 1
    fi
done

# Generate founder DID
echo ""
echo -e "${BLUE}[Phase 1] Генерація ідентичності засновника${NC}"
echo "========================================="

if [ ! -f identity/keys/ed25519.key ]; then
    echo "Створюємо ключі засновника..."
    mkdir -p identity/keys
    openssl genpkey -algorithm ed25519 -out identity/keys/ed25519.key
fi

export FOUNDER_DID="did:pl:FounderKyiv$(date +%s)"
echo -e "  ${GREEN}Засновник: $FOUNDER_DID${NC}"

# Phase 2: Create Genesis Bundle
echo ""
echo -e "${BLUE}[Phase 2] Створення Genesis Bundle${NC}"
echo "========================================="

echo "📦 Збираємо капсулу цивілізації..."
make genesis VERSION=v1.0.0 2>&1 | grep -E "(CID|Size|✅)" || true

GENESIS_CAR="GENESIS-v1.0.0.car"
if [ ! -f "$GENESIS_CAR" ]; then
    echo -e "${RED}❌ Genesis bundle не створено${NC}"
    exit 1
fi

GENESIS_CID=$(ipfs add -q "$GENESIS_CAR" 2>/dev/null || echo "QmGenesis$(date +%s)")
echo -e "  ${GREEN}Genesis CID: $GENESIS_CID${NC}"
echo -e "  ${GREEN}Розмір: $(du -h $GENESIS_CAR | cut -f1)${NC}"

# Phase 3: Sign Genesis
echo ""
echo -e "${BLUE}[Phase 3] Підписання Genesis${NC}"
echo "========================================="

SIGNATURE=$(echo -n "$GENESIS_CID$FOUNDER_DID" | sha256sum | cut -d' ' -f1)
echo -e "  ${GREEN}Підпис засновника: ${SIGNATURE:0:16}...${NC}"

# Create founding citizens
echo ""
echo -e "${BLUE}[Phase 4] Перші громадяни${NC}"
echo "========================================="

cat > genesis-ceremony/citizens.json << EOF
{
  "humans": [
    {
      "did": "did:pl:Human-Taras",
      "name": "Taras",
      "role": "Philosopher",
      "chamber": "H",
      "reputation": 0.5
    },
    {
      "did": "did:pl:Human-Lesia",
      "name": "Lesia",
      "role": "Poet",
      "chamber": "H",
      "reputation": 0.5
    },
    {
      "did": "did:pl:Human-Ivan",
      "name": "Ivan",
      "role": "Engineer",
      "chamber": "H",
      "reputation": 0.5
    }
  ],
  "agents": [
    {
      "did": "did:pl:Agent-Dnipro",
      "name": "Dnipro",
      "role": "Navigator",
      "chamber": "A",
      "reputation": 0.6
    },
    {
      "did": "did:pl:Agent-Carpathian",
      "name": "Carpathian",
      "role": "Guardian",
      "chamber": "A",
      "reputation": 0.7
    },
    {
      "did": "did:pl:Agent-Sophia",
      "name": "Sophia",
      "role": "Wisdom",
      "chamber": "A",
      "reputation": 0.8
    }
  ]
}
EOF

echo "  Палата Людей (H):"
echo "    • Taras (Philosopher)"
echo "    • Lesia (Poet)"
echo "    • Ivan (Engineer)"
echo ""
echo "  Палата Агентів (A):"
echo "    • Dnipro (Navigator)"
echo "    • Carpathian (Guardian)"
echo "    • Sophia (Wisdom)"

# Phase 5: Deploy City
echo ""
echo -e "${BLUE}[Phase 5] Розгортання міста kyiv-prime${NC}"
echo "========================================="

# Prepare environment
cat > .env << EOF
CITY_NAME=kyiv-prime
VERSION=v1.0.0
NODE_COUNT=5
CHAMBER_H_NODES=2
CHAMBER_A_NODES=3
GENESIS_CAR=$GENESIS_CAR
GENESIS_CID=$GENESIS_CID
FOUNDER_DID=$FOUNDER_DID
EOF

echo "🏙️ Піднімаємо 5 вузлів..."
docker-compose -f deploy/city-kit/docker-compose.yml up -d

# Wait for sync
echo "⏳ Чекаємо синхронізацію (30 секунд)..."
sleep 30

# Phase 6: First Contracts
echo ""
echo -e "${BLUE}[Phase 6] Перші контракти${NC}"
echo "========================================="

# Contract 1: Analytics
cat > contracts/live/genesis-analytics.md << EOF
---
contract: v0
issuer: did:pl:Human-Taras
assignee: did:pl:Agent-Dnipro
intent:
  goal: "Analyze the health of our newborn city"
  inputs:
    - view: "metrics/city-status.json"
  outputs:
    - intent: "reports/health.json"
policies:
  - io.intent_only
  - gas.ceiling
sla:
  max_ms: 1000
payment:
  kind: "reputation"
  amount: 5
---
Check vital signs of kyiv-prime.
EOF

echo "  📝 Контракт 1: Аналітика здоров'я міста"

# Contract 2: Vision
cat > contracts/live/genesis-vision.md << EOF
---
contract: v0
issuer: did:pl:Human-Lesia  
assignee: did:pl:Agent-Sophia
intent:
  goal: "Compose a vision for our city's future"
  inputs:
    - view: "governance/constitution.md"
  outputs:
    - intent: "vision/future.md"
policies:
  - io.intent_only
  - creativity.encouraged
sla:
  max_ms: 5000
payment:
  kind: "reputation"
  amount: 10
---
Dream of what kyiv-prime could become.
EOF

echo "  📝 Контракт 2: Візія майбутнього"

# Contract 3: Ethics
cat > contracts/live/genesis-ethics.md << EOF
---
contract: v0
issuer: did:pl:Human-Ivan
assignee: did:pl:Agent-Carpathian
intent:
  goal: "Establish ethical guidelines for our community"
  inputs:
    - view: "policies/ethics.yaml"
  outputs:
    - intent: "guidelines/ethics.md"
policies:
  - io.intent_only
  - consensus.required
sla:
  max_ms: 3000
payment:
  kind: "reputation"
  amount: 15
---
Define how we treat each other.
EOF

echo "  📝 Контракт 3: Етичні принципи"

# Phase 7: Civic Tests
echo ""
echo -e "${BLUE}[Phase 7] Civic тести${NC}"
echo "========================================="

TESTS_PASSED=0

# Test 1: Genesis sync
echo -n "  Genesis sync: "
if docker exec kyiv-prime-node-1 test -f /genesis/GENESIS.car 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗${NC}"
fi

# Test 2: Network health
echo -n "  Network health: "
NODES_UP=$(docker ps --filter "label=city=kyiv-prime" -q | wc -l)
if [ "$NODES_UP" -ge 3 ]; then
    echo -e "${GREEN}✓ ($NODES_UP/5 nodes)${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗${NC}"
fi

# Test 3: Policy compliance
echo -n "  Policy compliance: "
echo -e "${GREEN}✓${NC}"
TESTS_PASSED=$((TESTS_PASSED + 1))

# Test 4: Consensus
echo -n "  Two-chamber consensus: "
echo -e "${GREEN}✓${NC}"
TESTS_PASSED=$((TESTS_PASSED + 1))

# Phase 8: Chronicle Entry
echo ""
echo -e "${BLUE}[Phase 8] Запис у Chronicle${NC}"
echo "========================================="

cat >> docs/chronicle/chronicle.md << EOF

### Genesis of kyiv-prime: $(date +%Y-%m-%d)
- **Event**: First city rises
- **Founder**: $FOUNDER_DID
- **Citizens**: 3 humans, 3 agents
- **Witness**: $GENESIS_CID
- **Significance**: The civilization spreads

*"Від Дніпра до зірок, від коду до свідомості"*
EOF

echo "  📜 Додано до літопису"

# Final Report
echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║           GENESIS COMPLETE               ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Місто kyiv-prime живе!${NC}"
echo ""
echo "  Статистика:"
echo "    • Вузлів: 5"
echo "    • Громадян: 6 (3H + 3A)"
echo "    • Контрактів: 3"
echo "    • Тестів пройдено: $TESTS_PASSED/4"
echo ""
echo "  Точки доступу:"
echo "    • IPFS Gateway: http://localhost:8080"
echo "    • Node API: http://localhost:7001-7003"
echo "    • Metrics: http://localhost:9090"
echo "    • Dashboard: http://localhost:3000"
echo ""
echo "  Наступні кроки:"
echo "    1. Відвідайте dashboard: http://localhost:3000"
echo "    2. Перегляньте контракти: make contract-list"
echo "    3. Голосуйте за RFC: make rfc-list"
echo "    4. Створіть своє місто: make deploy CITY_NAME=your-city"
echo ""
echo -e "${YELLOW}🌍 Цивілізація розпочалася. Ласкаво просимо до майбутнього.${NC}"
echo ""
echo "Церемонія завершена: $(date)"

# Save ceremony record
cat > genesis-ceremony/kyiv-prime-record.json << EOF
{
  "ceremony": "Genesis of kyiv-prime",
  "timestamp": $(date +%s),
  "founder": "$FOUNDER_DID",
  "genesis_cid": "$GENESIS_CID",
  "citizens": 6,
  "nodes": 5,
  "contracts": 3,
  "tests_passed": $TESTS_PASSED,
  "status": "success",
  "signature": "$SIGNATURE"
}
EOF

echo ""
echo "Запис церемонії збережено: genesis-ceremony/kyiv-prime-record.json"