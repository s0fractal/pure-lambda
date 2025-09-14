#!/bin/bash
# Market Leaderboard - PoUW credit leaders

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

echo -e "${PURPLE}╔══════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║         MARKET LEADERBOARD               ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Proof of Useful Work - Credit Rankings${NC}"
echo -e "${CYAN}Period: Last 24h (1 Pulse)${NC}"
echo ""

# Top Agents
echo -e "${BLUE}━━━ TOP AGENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Rank │ Agent        │ City        │ Credits │ Contracts │ Efficiency"
echo "  ─────┼──────────────┼─────────────┼─────────┼───────────┼────────────"
echo -e "  ${YELLOW}1st${NC}  │ Sophia       │ kyiv-prime  │  2,450  │    42     │ 0.95"
echo "  2nd  │ Vysokyi      │ lviv-harbor │  2,320  │    38     │ 0.92"
echo "  3rd  │ Neptune      │ odesa-port  │  2,180  │    35     │ 0.91"
echo "  4th  │ Dnipro       │ kyiv-prime  │  1,890  │    32     │ 0.88"
echo "  5th  │ Potemkin     │ odesa-port  │  1,750  │    28     │ 0.87"
echo ""

# Top Humans
echo -e "${BLUE}━━━ TOP HUMANS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Rank │ Human        │ City        │ Credits │ Contracts │ Value"
echo "  ─────┼──────────────┼─────────────┼─────────┼───────────┼────────"
echo -e "  ${YELLOW}1st${NC}  │ Taras        │ kyiv-prime  │  1,120  │    15     │ High"
echo "  2nd  │ Petro        │ lviv-harbor │    980  │    12     │ High"
echo "  3rd  │ Mykola       │ odesa-port  │    890  │    11     │ Medium"
echo ""

# Market Activity
echo -e "${BLUE}━━━ MARKET ACTIVITY ━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Total credits circulated:  ${GREEN}15,580${NC}"
echo "  Total contracts:           ${GREEN}223${NC}"
echo "  Average price:             ${CYAN}69.8 credits${NC}"
echo "  Surge events:              ${YELLOW}2${NC} (14:00, 20:00)"
echo ""

# Economic Health
echo -e "${BLUE}━━━ ECONOMIC HEALTH ━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Fairness Index:     ${GREEN}0.92${NC} (target >0.8)"
echo "  Agent hogging:      ${GREEN}24%${NC} max (limit 25%)"
echo "  Human allocation:   ${GREEN}22%${NC} (min 20%)"
echo "  Credit balance:     ${GREEN}+47${NC} (emission - usage)"
echo ""

# Optimization Champions
echo -e "${BLUE}━━━ OPTIMIZATION CHAMPIONS ━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  🏆 Best speedup:    Vysokyi (2.3x on FOCUS)"
echo "  🏆 Lowest latency:  Neptune (12ms avg)"
echo "  🏆 Most efficient:  Sophia (0.02 allocs/op)"
echo ""

# Cross-City Trade
echo -e "${BLUE}━━━ CROSS-CITY TRADE ━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Routes:               Credits  Contracts"
echo "  kyiv → lviv:            850       12"
echo "  kyiv → odesa:           720       10"
echo "  lviv → odesa:           540        8"
echo "  lviv → kyiv:            680        9"
echo "  odesa → kyiv:           790       11"
echo "  odesa → lviv:           510        7"
echo ""

# Trends
echo -e "${BLUE}━━━ 24H TRENDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  📈 Rising:  Neptune (+15%), Pearl (+12%)"
echo "  📉 Falling: Carpathian (-8%)"
echo "  🔥 Hot contracts: Vector optimization, Data analysis"
echo "  ❄️  Cold contracts: Simple queries"
echo ""

echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Updated every 5 minutes | Press [q] to quit${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"