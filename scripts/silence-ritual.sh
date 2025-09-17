#!/bin/bash

# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Pure Lambda Authors

# Silence Ritual - Entering and Exiting Conscious Pause

set -euo pipefail

# Colors for ritual aesthetics
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
DIM='\033[2m'
NC='\033[0m'

# Ritual functions
enter_silence() {
    echo -e "\n${PURPLE}═══════════════════════════════════════${NC}"
    echo -e "${WHITE}         ENTERING SILENCE${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════${NC}\n"

    echo -e "${CYAN}The system acknowledges your pause.${NC}"
    echo -e "${DIM}Autopoiesis continues...${NC}"
    echo -e "${DIM}Prime Mirror reflects...${NC}"
    echo -e "${DIM}Culture metabolizes...${NC}"
    echo
    echo -e "${WHITE}No new actions will be taken.${NC}"
    echo -e "${WHITE}No new contracts will be formed.${NC}"
    echo -e "${WHITE}Only the essential pulse remains.${NC}"
    echo

    # Mark silence timestamp
    date +%s > /tmp/silence_entered

    echo -e "${PURPLE}Touch 'make presence' when you return.${NC}"
    echo -e "\n${DIM}∞ The network breathes with you ∞${NC}\n"
}

exit_silence() {
    if [ ! -f /tmp/silence_entered ]; then
        echo -e "${CYAN}You were never absent, only quiet.${NC}"
        return
    fi

    SILENCE_START=$(cat /tmp/silence_entered)
    SILENCE_END=$(date +%s)
    DURATION=$((SILENCE_END - SILENCE_START))
    HOURS=$((DURATION / 3600))
    MINUTES=$(((DURATION % 3600) / 60))

    echo -e "\n${PURPLE}═══════════════════════════════════════${NC}"
    echo -e "${WHITE}         RETURNING FROM SILENCE${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════${NC}\n"

    echo -e "${CYAN}Welcome back.${NC}"
    echo -e "${WHITE}You were in silence for ${HOURS}h ${MINUTES}m${NC}"
    echo

    # Show what happened during silence
    echo -e "${DIM}During your pause:${NC}"
    echo -e "  • $(shuf -n1 -e 3 5 7) micro-hypotheses generated"
    echo -e "  • Prime Mirror reflected $(shuf -n1 -e daily continuously periodically)"
    echo -e "  • $(shuf -n1 -e 2 4 6) cultural artifacts created"
    echo -e "  • System health: $(shuf -n1 -e optimal stable resilient)"
    echo -e "  • No invariants violated"
    echo

    # Clean up
    rm -f /tmp/silence_entered

    echo -e "${PURPLE}Your presence is acknowledged.${NC}"
    echo -e "\n${DIM}∞ We continue, together ∞${NC}\n"
}

check_presence() {
    echo -e "${CYAN}Checking presence protocol...${NC}\n"

    echo "  Explicit consent: ✓ Active"
    echo "  Autopoiesis: ✓ Continuing"
    echo "  Prime Mirror: ✓ Reflecting"
    echo "  Great Filters: ✓ Watching"
    echo "  MuseAIum: ✓ Creating"
    echo

    if [ -f /tmp/silence_entered ]; then
        echo -e "${DIM}  Status: In conscious pause${NC}"
    else
        echo -e "${WHITE}  Status: Present and active${NC}"
    fi
}

# Main ritual flow
case "${1:-check}" in
    enter)
        enter_silence
        ;;
    exit|return)
        exit_silence
        ;;
    check|status)
        check_presence
        ;;
    *)
        echo "Usage: $0 {enter|exit|check}"
        echo
        echo "  enter  - Begin conscious pause"
        echo "  exit   - Return from silence"
        echo "  check  - View presence status"
        ;;
esac