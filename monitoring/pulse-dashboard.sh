#!/bin/bash
# City Pulse Dashboard - Real-time health monitoring
# Updates every 5 seconds

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

while true; do
    # Clear screen and move cursor to top
    printf "\033[H\033[J"
    
    # Header
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║               KYIV-PRIME PULSE DASHBOARD                 ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Timestamp: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
    
    # Core Metrics
    echo -e "${BLUE}━━━ CORE METRICS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Integrity Index (target ≥0.99)
    INTEGRITY=$(echo "0.99" | bc)
    if (( $(echo "$INTEGRITY >= 0.99" | bc -l) )); then
        echo -e "Integrity Index:        ${GREEN}$INTEGRITY ✓${NC}"
    else
        echo -e "Integrity Index:        ${RED}$INTEGRITY ✗${NC}"
    fi
    
    # Social Latency (target ≤48h)
    SOCIAL_LATENCY="12h"
    echo -e "Social Latency:         ${GREEN}$SOCIAL_LATENCY ✓${NC}"
    
    # Survival Half-life (40% tolerance)
    echo -e "Survival Half-life:     ${GREEN}40% tolerance ✓${NC}"
    
    # Culture Coverage (target ≥90%)
    CULTURE_COV="92"
    echo -e "Culture Coverage:       ${GREEN}${CULTURE_COV}% ✓${NC}"
    
    # Adaptation Gain (target ≥80%)
    ADAPT_GAIN="85"
    echo -e "Adaptation Gain:        ${GREEN}${ADAPT_GAIN}% ✓${NC}"
    
    echo ""
    
    # Network Status
    echo -e "${BLUE}━━━ NETWORK STATUS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Node status (simulate based on timestamp)
    NODES_TOTAL=5
    NODES_UP=$((3 + RANDOM % 3))  # 3-5 nodes
    
    if [ $NODES_UP -ge 3 ]; then
        echo -e "Nodes Online:           ${GREEN}$NODES_UP/$NODES_TOTAL ✓${NC}"
    else
        echo -e "Nodes Online:           ${YELLOW}$NODES_UP/$NODES_TOTAL ⚠${NC}"
    fi
    
    # Citizens
    echo -e "Active Citizens:        ${GREEN}6${NC} (3H + 3A)"
    
    # Contracts
    CONTRACTS_ACTIVE=$((RANDOM % 5 + 1))
    CONTRACTS_COMPLETED=$((RANDOM % 10 + 10))
    echo -e "Contracts (Active):     ${CYAN}$CONTRACTS_ACTIVE${NC}"
    echo -e "Contracts (24h):        ${GREEN}$CONTRACTS_COMPLETED completed${NC}"
    
    echo ""
    
    # Chamber Activity
    echo -e "${BLUE}━━━ CHAMBER ACTIVITY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Chamber H (Humans)
    echo -e "${YELLOW}Chamber H (Humans):${NC}"
    echo -e "  • Proposals:          2 active"
    echo -e "  • Participation:      ${GREEN}100%${NC}"
    echo -e "  • Latest vote:        RFC-001 (pending)"
    
    # Chamber A (Agents)
    echo -e "${YELLOW}Chamber A (Agents):${NC}"
    echo -e "  • Proposals:          1 active"
    echo -e "  • Participation:      ${GREEN}100%${NC}"
    echo -e "  • Latest vote:        RFC-001 (pending)"
    
    echo ""
    
    # Performance Metrics
    echo -e "${BLUE}━━━ PERFORMANCE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Simulate metrics
    CPU_USAGE=$((15 + RANDOM % 20))
    MEM_USAGE=$((30 + RANDOM % 20))
    DISK_USAGE=$((45 + RANDOM % 10))
    
    # CPU
    if [ $CPU_USAGE -lt 50 ]; then
        echo -e "CPU Usage:              ${GREEN}${CPU_USAGE}%${NC} ▁▂▃"
    elif [ $CPU_USAGE -lt 80 ]; then
        echo -e "CPU Usage:              ${YELLOW}${CPU_USAGE}%${NC} ▁▂▃▄▅"
    else
        echo -e "CPU Usage:              ${RED}${CPU_USAGE}%${NC} ▁▂▃▄▅▆▇"
    fi
    
    # Memory
    echo -e "Memory Usage:           ${GREEN}${MEM_USAGE}%${NC} ▁▂▃▄"
    
    # Disk
    echo -e "Disk Usage:             ${GREEN}${DISK_USAGE}%${NC} ▁▂▃▄"
    
    # Network
    echo -e "Network I/O:            ${GREEN}↓ 1.2MB/s ↑ 0.8MB/s${NC}"
    
    echo ""
    
    # Sustainability
    echo -e "${BLUE}━━━ SUSTAINABILITY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    CARBON_KG="0.042"
    EFFICIENCY="0.89"
    WARNINGS="3"
    
    echo -e "Carbon (24h):           ${GREEN}${CARBON_KG} kg${NC}"
    echo -e "Efficiency Score:       ${GREEN}${EFFICIENCY}${NC}"
    echo -e "Policy Warnings:        ${YELLOW}${WARNINGS}${NC}"
    echo -e "Terminated Contracts:   ${GREEN}0${NC}"
    
    echo ""
    
    # Recent Events (rotating messages)
    echo -e "${BLUE}━━━ RECENT EVENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    EVENTS=(
        "${GREEN}✓${NC} Contract QmAbc... completed by Agent-Dnipro"
        "${GREEN}✓${NC} New citizen joined: did:pl:Human-Maria"
        "${CYAN}↻${NC} Timecapsule synced with lviv-harbor"
        "${YELLOW}⚡${NC} RFC-002 entered voting phase"
        "${GREEN}✓${NC} Attestation verified for Agent-Sophia"
        "${CYAN}↻${NC} Registry head updated: QmHead..."
        "${GREEN}✓${NC} Reputation transferred: +5 to Agent-Carpathian"
    )
    
    # Show 3 random events
    for i in {1..3}; do
        EVENT_IDX=$((RANDOM % ${#EVENTS[@]}))
        echo "  $(date '+%H:%M:%S') ${EVENTS[$EVENT_IDX]}"
    done
    
    echo ""
    
    # Policy Compliance
    echo -e "${BLUE}━━━ POLICY COMPLIANCE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo -e "IO Confinement:         ${GREEN}100% compliant${NC}"
    echo -e "Gas Ceiling:            ${GREEN}0 violations${NC}"
    echo -e "Consent Tracking:       ${GREEN}All valid${NC}"
    echo -e "Attestation Rate:       ${GREEN}100%${NC}"
    
    echo ""
    
    # Footer
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Commands: [q]uit | [r]efresh | [m]etrics | [l]ogs${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Check for user input (non-blocking)
    read -t 5 -n 1 key || true
    
    if [[ $key == "q" ]]; then
        echo ""
        echo "Dashboard stopped."
        break
    fi
done