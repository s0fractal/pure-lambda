#!/bin/bash
# 🎮 Control Panel - Three buttons to control your proxy agent

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load status if exists
if [ -f absorption/status.json ]; then
    AGENT_DID=$(jq -r '.agent_did' absorption/status.json 2>/dev/null || echo "unknown")
    HUMAN_DID=$(jq -r '.human_did' absorption/status.json 2>/dev/null || echo "unknown")
else
    echo -e "${RED}No absorption ceremony found. Run ./absorption/ceremony.sh first${NC}"
    exit 1
fi

show_status() {
    echo "════════════════════════════════════════════════════════════"
    echo "                    🎮 CONTROL PANEL                        "
    echo "════════════════════════════════════════════════════════════"
    echo
    echo -e "${BLUE}Agent Status:${NC}"

    # Check last touch
    if [ -f out/touch.json ]; then
        LAST_TOUCH=$(jq -r '.ts' out/touch.json 2>/dev/null || echo 0)
        NOW=$(date +%s%3N)
        DIFF=$((NOW - LAST_TOUCH))
        HOURS=$((DIFF / 3600000))

        if [ $HOURS -lt 24 ]; then
            echo -e "  Last Touch: ${GREEN}${HOURS} hours ago (ACTIVE)${NC}"
        else
            echo -e "  Last Touch: ${YELLOW}${HOURS} hours ago (NEEDS TOUCH)${NC}"
        fi
    else
        echo -e "  Last Touch: ${RED}Never (INACTIVE)${NC}"
    fi

    # Check silence mode
    if [ -f policies/silence.active ]; then
        echo -e "  Mode: ${YELLOW}SILENCE${NC}"
    else
        echo -e "  Mode: ${GREEN}ACTIVE${NC}"
    fi

    # Check agent activities
    if [ -d chronicle ]; then
        RECENT=$(find chronicle -type f -mmin -60 2>/dev/null | wc -l)
        echo -e "  Recent Publications: ${RECENT} in last hour"
    fi

    if [ -d autopoiesis/microH ]; then
        ACTIVE_H=$(find autopoiesis/microH -name "*.proposal" 2>/dev/null | wc -l)
        echo -e "  Active Hypotheses: ${ACTIVE_H}"
    fi

    echo
}

touch_presence() {
    echo -e "${BLUE}[TOUCH]${NC} Signaling presence..."

    # Create touch event
    mkdir -p out
    cat > out/touch.json <<EOF
{
  "event": {
    "type": "touch",
    "ts": $(date +%s%3N),
    "did": "${HUMAN_DID}"
  }
}
EOF

    # Remove silence if active
    rm -f policies/silence.active

    # Update agent permission
    if [ -f agents/proxies/*/presence.lock ]; then
        rm -f agents/proxies/*/presence.lock
    fi

    echo -e "${GREEN}✓${NC} Presence signaled. Agent can act for next 24 hours."

    # Log to chronicle
    mkdir -p chronicle
    echo "$(date -Iseconds) | TOUCH | Human presence confirmed" >> chronicle/control.log
}

enter_silence() {
    echo -e "${YELLOW}[SILENCE]${NC} Entering silence mode..."

    # Activate silence policy
    touch policies/silence.active

    # Create silence lock for all agents
    find agents/proxies -type d -exec touch {}/silence.lock \;

    # Stop auto-publisher
    if [ -f agents/proxies/*/autopublish.pid ]; then
        kill $(cat agents/proxies/*/autopublish.pid) 2>/dev/null || true
        rm -f agents/proxies/*/autopublish.pid
    fi

    echo -e "${GREEN}✓${NC} Silence mode activated. Only essential operations continue."

    # Log to chronicle
    echo "$(date -Iseconds) | SILENCE | Entering silence mode" >> chronicle/control.log
}

kill_switch() {
    echo -e "${RED}[KILL SWITCH]${NC} EMERGENCY REVOCATION"
    echo -e "${RED}This will immediately revoke all delegations!${NC}"
    read -p "Are you sure? Type 'REVOKE' to confirm: " CONFIRM

    if [ "$CONFIRM" != "REVOKE" ]; then
        echo "Aborted."
        return
    fi

    echo -e "${RED}Revoking all delegations...${NC}"

    # Revoke UCAN
    if [ -f auth/ucan/*.json ]; then
        for ucan in auth/ucan/*.json; do
            mv "$ucan" "$ucan.revoked.$(date +%s)"
        done
    fi

    # Disable agent
    find agents/proxies -name "*.yaml" -exec mv {} {}.disabled \;

    # Stop all agent processes
    pkill -f "agent.*${AGENT_DID}" 2>/dev/null || true

    # Create kill marker
    cat > absorption/killed.json <<EOF
{
  "killed_at": $(date +%s),
  "reason": "Manual kill switch activated",
  "agent": "${AGENT_DID}",
  "human": "${HUMAN_DID}"
}
EOF

    # Archive all pending operations
    if [ -d autopoiesis/microH ]; then
        tar czf autopoiesis/microH.killed.$(date +%s).tar.gz autopoiesis/microH/
        rm -rf autopoiesis/microH/*
    fi

    echo -e "${GREEN}✓${NC} All delegations revoked. Agent stopped."
    echo -e "${YELLOW}To re-enable, run ./absorption/ceremony.sh again${NC}"

    # Log to chronicle
    echo "$(date -Iseconds) | KILL | Emergency revocation executed" >> chronicle/control.log
}

show_help() {
    echo
    echo -e "${BLUE}Available Commands:${NC}"
    echo
    echo -e "  ${GREEN}1) touch${NC}    - Signal presence (allows agent to act)"
    echo -e "  ${YELLOW}2) silence${NC}  - Enter silence mode (minimal activity)"
    echo -e "  ${RED}3) kill${NC}     - Emergency revoke all delegations"
    echo -e "  ${BLUE}4) status${NC}   - Show current status"
    echo -e "  ${NC}5) quit${NC}     - Exit control panel"
    echo
}

# Main loop
while true; do
    show_status
    show_help

    read -p "Command (1-5): " CMD

    case $CMD in
        1|touch)
            touch_presence
            ;;
        2|silence)
            enter_silence
            ;;
        3|kill)
            kill_switch
            break
            ;;
        4|status)
            # Just refresh status
            ;;
        5|quit|exit)
            echo "Goodbye."
            break
            ;;
        *)
            echo -e "${RED}Invalid command${NC}"
            ;;
    esac

    echo
    read -p "Press Enter to continue..."
    clear
done