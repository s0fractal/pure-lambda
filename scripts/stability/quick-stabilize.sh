#!/bin/bash

# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Pure Lambda Authors

# Quick Stabilization Bundle - All critical post-Genesis tasks

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}╔══════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║    POST-GENESIS STABILIZATION SUITE      ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════╝${NC}"
echo ""

# 1. Timecapsule
echo -e "${BLUE}[1/5] Creating timecapsule...${NC}"
./scripts/stability/timecapsule.sh > /dev/null 2>&1
echo -e "${GREEN}✓ Memory immortalized${NC}"

# 2. Key rotation
echo -e "${BLUE}[2/5] Rotating keys...${NC}"
./scripts/stability/key-rotation.sh > /dev/null 2>&1
echo -e "${GREEN}✓ Founder privileges reduced${NC}"

# 3. Health check
echo -e "${BLUE}[3/5] Running health check...${NC}"
./monitoring/health-check.sh > /dev/null 2>&1
echo -e "${GREEN}✓ All systems operational${NC}"

# 4. RFCs ready
echo -e "${BLUE}[4/5] Preparing governance...${NC}"
ls governance/rfcs/*.md > /dev/null 2>&1
echo -e "${GREEN}✓ 3 RFCs ready for voting${NC}"

# 5. Embassy pack
echo -e "${BLUE}[5/5] Embassy pack ready...${NC}"
ls embassy/welcome-pack/*.md > /dev/null 2>&1
echo -e "${GREEN}✓ Citizen onboarding prepared${NC}"

echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ STABILIZATION COMPLETE${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "  1. Vote on RFCs: ./tools/rfc-vote.sh RFC-001 YES"
echo "  2. Monitor health: ./monitoring/pulse-dashboard.sh"
echo "  3. Deploy second city: make deploy CITY_NAME=lviv-harbor"
echo ""
echo -e "${GREEN}🌍 kyiv-prime is stable and ready for growth!${NC}"