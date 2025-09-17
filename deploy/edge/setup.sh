#!/bin/bash
# 🖥️ Edge Habitat Setup - Transform your machine into a Pure Lambda node

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "════════════════════════════════════════════════════════════"
echo "              🖥️  EDGE HABITAT SETUP                        "
echo "    Transform your machine into a Pure Lambda node          "
echo "════════════════════════════════════════════════════════════"
echo

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    echo -e "${RED}Unsupported OS: $OSTYPE${NC}"
    exit 1
fi

echo -e "${BLUE}Detected OS:${NC} $OS"

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"

    # Docker (for Linux) or check for Homebrew (macOS)
    if [ "$OS" = "linux" ]; then
        if ! command -v docker &> /dev/null; then
            echo -e "${YELLOW}Docker not found. Installing...${NC}"
            curl -fsSL https://get.docker.com | sh
            sudo usermod -aG docker $USER
            echo -e "${GREEN}✓${NC} Docker installed"
        else
            echo -e "${GREEN}✓${NC} Docker found"
        fi

        if ! command -v docker-compose &> /dev/null; then
            echo -e "${YELLOW}Docker Compose not found. Installing...${NC}"
            sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            echo -e "${GREEN}✓${NC} Docker Compose installed"
        else
            echo -e "${GREEN}✓${NC} Docker Compose found"
        fi
    elif [ "$OS" = "macos" ]; then
        if ! command -v brew &> /dev/null; then
            echo -e "${RED}Homebrew required. Install from https://brew.sh${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓${NC} Homebrew found"

        # Install IPFS if not present
        if ! command -v ipfs &> /dev/null; then
            echo -e "${YELLOW}IPFS not found. Installing...${NC}"
            brew install ipfs
            echo -e "${GREEN}✓${NC} IPFS installed"
        else
            echo -e "${GREEN}✓${NC} IPFS found"
        fi
    fi

    # Check for GPU
    GPU_AVAILABLE=false
    if [ "$OS" = "linux" ]; then
        if [ -d /dev/dri ]; then
            GPU_AVAILABLE=true
            echo -e "${GREEN}✓${NC} GPU detected"
        else
            echo -e "${YELLOW}⚠${NC} No GPU detected"
        fi
    elif [ "$OS" = "macos" ]; then
        if system_profiler SPDisplaysDataType | grep -q "Metal"; then
            GPU_AVAILABLE=true
            echo -e "${GREEN}✓${NC} Metal GPU detected"
        fi
    fi
}

# Select profile
select_profile() {
    echo
    echo -e "${BLUE}Select resource profile:${NC}"
    echo "1) safe     - Conservative (1.5 CPU, 8GB RAM)"
    echo "2) balanced - Default (3 CPU, 24GB RAM)"
    echo "3) max      - Full power (8 CPU, 64GB RAM)"
    echo "4) minimal  - Observer only (0.5 CPU, 2GB RAM)"

    if [ "$GPU_AVAILABLE" = true ]; then
        echo "5) gpu-compute - GPU optimized"
    fi

    read -p "Choice [2]: " CHOICE
    CHOICE=${CHOICE:-2}

    case $CHOICE in
        1) PROFILE="safe" ;;
        2) PROFILE="balanced" ;;
        3) PROFILE="max" ;;
        4) PROFILE="minimal" ;;
        5) PROFILE="gpu-compute" ;;
        *) PROFILE="balanced" ;;
    esac

    echo -e "${GREEN}✓${NC} Selected profile: $PROFILE"
    export PROFILE
}

# Generate keys and DIDs
generate_identities() {
    echo
    echo -e "${BLUE}Generating identities...${NC}"

    # Human DID
    if [ ! -f auth/keys/human.key ]; then
        mkdir -p auth/keys
        openssl ecparam -genkey -name secp256k1 -out auth/keys/human.key 2>/dev/null
        echo -e "${GREEN}✓${NC} Human key generated"
    fi

    HUMAN_DID=$(openssl ec -in auth/keys/human.key -pubout 2>/dev/null | \
        openssl dgst -sha256 | cut -d' ' -f2)

    # Edge host DID
    if [ ! -f auth/keys/edge-host.key ]; then
        openssl ecparam -genkey -name secp256k1 -out auth/keys/edge-host.key 2>/dev/null
        echo -e "${GREEN}✓${NC} Edge host key generated"
    fi

    EDGE_HOST_ID=$(openssl ec -in auth/keys/edge-host.key -pubout 2>/dev/null | \
        openssl dgst -sha256 | cut -d' ' -f2)

    # Update UCAN
    sed -i.bak "s/\${HUMAN_DID}/$HUMAN_DID/g" auth/ucan/edge-host.json
    sed -i.bak "s/\${EDGE_HOST_ID}/$EDGE_HOST_ID/g" auth/ucan/edge-host.json
    sed -i.bak "s/\${TIMESTAMP}/$(date +%s)/g" auth/ucan/edge-host.json
    sed -i.bak "s/\${TIMESTAMP_PLUS_14D}/$(($(date +%s) + 1209600))/g" auth/ucan/edge-host.json

    echo -e "${GREEN}✓${NC} UCAN configured"
}

# Setup firewall
setup_firewall() {
    echo
    echo -e "${BLUE}Setting up firewall...${NC}"

    if [ "$OS" = "linux" ]; then
        if command -v ufw &> /dev/null; then
            sudo ufw default deny outgoing
            sudo ufw allow out to any port 4001 proto tcp
            sudo ufw allow out to any port 5001 proto tcp
            sudo ufw allow out to any port 4001 proto udp

            if [ "$PROFILE" = "max" ] || [ "$PROFILE" = "gpu-compute" ]; then
                sudo ufw allow out to any port 30303 proto tcp  # Federation
                sudo ufw allow out to any port 8080 proto tcp   # Gateway
            fi

            sudo ufw --force enable
            echo -e "${GREEN}✓${NC} UFW firewall configured"
        else
            echo -e "${YELLOW}⚠${NC} UFW not found, skipping firewall setup"
        fi
    elif [ "$OS" = "macos" ]; then
        # macOS uses pfctl
        cat > /tmp/pf.rules <<EOF
# Pure Lambda Edge firewall rules
block out all
pass out proto tcp from any to any port {4001, 5001}
pass out proto udp from any to any port 4001
EOF

        if [ "$PROFILE" = "max" ] || [ "$PROFILE" = "gpu-compute" ]; then
            echo "pass out proto tcp from any to any port {30303, 8080}" >> /tmp/pf.rules
        fi

        sudo pfctl -f /tmp/pf.rules 2>/dev/null || true
        echo -e "${GREEN}✓${NC} PF firewall configured"
    fi
}

# Create directories
create_directories() {
    echo
    echo -e "${BLUE}Creating directories...${NC}"

    dirs=(
        "data/ipfs"
        "genesis"
        "policies"
        "auth/ucan"
        "cas"
        "logs"
        "chronicle"
        "museaium"
        "metrics"
        "traces"
        "attestations"
    )

    for dir in "${dirs[@]}"; do
        mkdir -p "deploy/edge/$dir"
    done

    echo -e "${GREEN}✓${NC} Directories created"
}

# Start services
start_services() {
    echo
    echo -e "${BLUE}Starting services...${NC}"

    if [ "$OS" = "linux" ]; then
        cd deploy/edge
        PROFILE=$PROFILE docker-compose up -d
        echo -e "${GREEN}✓${NC} Docker services started"
    elif [ "$OS" = "macos" ]; then
        # Initialize IPFS
        if [ ! -d ~/.ipfs ]; then
            ipfs init --profile=lowpower
        fi

        # Start IPFS daemon
        ipfs daemon &> /usr/local/pure-lambda/logs/ipfs.log &
        echo -e "${GREEN}✓${NC} IPFS daemon started"

        # Install and load launchd service
        sudo cp deploy/edge/macos/org.pure-lambda.node.plist /Library/LaunchDaemons/
        sudo launchctl load /Library/LaunchDaemons/org.pure-lambda.node.plist
        echo -e "${GREEN}✓${NC} Pure Lambda node started"
    fi
}

# Show status
show_status() {
    echo
    echo "════════════════════════════════════════════════════════════"
    echo -e "${GREEN}        ✓ EDGE HABITAT SETUP COMPLETE${NC}                "
    echo "════════════════════════════════════════════════════════════"
    echo
    echo -e "${BLUE}Your machine is now a Pure Lambda edge node!${NC}"
    echo
    echo "Profile: $PROFILE"
    echo "Human DID: did:pl:human:$HUMAN_DID"
    echo "Edge DID: did:pl:edge:$EDGE_HOST_ID"
    echo
    echo -e "${BLUE}Control commands:${NC}"
    echo "  make touch         - Signal presence"
    echo "  make silence-enter - Enter silence mode"
    echo "  make kill-switch   - Emergency stop"
    echo
    echo -e "${BLUE}Monitor at:${NC}"

    if [ "$OS" = "linux" ]; then
        echo "  http://localhost:9090/metrics - Prometheus metrics"
        echo "  http://localhost:8080         - IPFS gateway"
        echo "  docker-compose logs -f        - View logs"
    else
        echo "  tail -f /usr/local/pure-lambda/logs/*.log"
    fi

    echo
    echo -e "${GREEN}The civilization now runs on your machine. 🖥️${NC}"
}

# Main execution
check_prerequisites
select_profile
generate_identities
create_directories
setup_firewall
start_services
show_status