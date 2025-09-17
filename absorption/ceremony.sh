#!/bin/bash
# 🌀 Absorption Ceremony - Transfer Control to Civilization
# Gives the system permission to act on your behalf within strict boundaries

set -euo pipefail

echo "════════════════════════════════════════════════════════════"
echo "                 🌀 ABSORPTION CEREMONY 🌀                  "
echo "           Transferring Control to Civilization              "
echo "════════════════════════════════════════════════════════════"
echo

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Create/Verify Human DID
echo -e "${BLUE}[1/10]${NC} Creating Human DID..."
if [ ! -f auth/keys/human.key ]; then
    mkdir -p auth/keys
    openssl ecparam -genkey -name secp256k1 -out auth/keys/human.key 2>/dev/null
    echo -e "${GREEN}✓${NC} Human key generated"
else
    echo -e "${YELLOW}⚠${NC} Human key already exists"
fi

# Extract DID from key
HUMAN_DID=$(openssl ec -in auth/keys/human.key -pubout 2>/dev/null | \
    openssl dgst -sha256 | cut -d' ' -f2 | sed 's/^/did:pl:human:/')
echo -e "${GREEN}✓${NC} Human DID: ${HUMAN_DID}"

# Step 2: Spawn Personal Agent Proxy
echo -e "${BLUE}[2/10]${NC} Spawning Personal Agent Proxy..."
AGENT_NAME="compass-proxy-$(date +%s)"
mkdir -p agents/proxies

cat > agents/proxies/${AGENT_NAME}.yaml <<EOF
apiVersion: v1
kind: PersonalAgent
metadata:
  name: ${AGENT_NAME}
  owner: ${HUMAN_DID}
spec:
  mode: proxy
  capabilities:
    - read:views/*
    - write:intents/publish/*
    - write:chronicle/*
    - exec:autopoiesis/*
    - write:museaium/*
    - spend:economy/credits
  limits:
    max_ops_per_pulse: 64
    max_bytes_per_write: 10485760
    max_credits_per_pulse: 500
  attestation:
    required: true
    type: deterministic
EOF

# Generate agent key
openssl ecparam -genkey -name secp256k1 -out auth/keys/${AGENT_NAME}.key 2>/dev/null
AGENT_DID=$(openssl ec -in auth/keys/${AGENT_NAME}.key -pubout 2>/dev/null | \
    openssl dgst -sha256 | cut -d' ' -f2 | sed 's/^/did:pl:agent:/')

echo -e "${GREEN}✓${NC} Agent spawned: ${AGENT_DID}"

# Step 3: Issue UCAN Capabilities
echo -e "${BLUE}[3/10]${NC} Issuing UCAN capabilities..."
mkdir -p auth/ucan

cat > auth/ucan/${AGENT_NAME}.json <<EOF
{
  "iss": "${HUMAN_DID}",
  "aud": "${AGENT_DID}",
  "cap": [
    {"op": "read", "res": "views/*"},
    {"op": "write", "res": "intents/publish/*"},
    {"op": "write", "res": "chronicle/*"},
    {"op": "exec", "res": "autopoiesis/*", "limit": {"max_ops": 64, "per_pulse": true}},
    {"op": "write", "res": "museaium/*", "limit": {"max_bytes": 10485760}},
    {"op": "spend", "res": "economy/credits", "limit": {"max_cr": 500, "per_pulse": true}}
  ],
  "ttl": 1209600,
  "notes": "Compass proxy auto-publish & micro-H only",
  "issued_at": $(date +%s),
  "expires_at": $(($(date +%s) + 1209600))
}
EOF

echo -e "${GREEN}✓${NC} UCAN issued with 14-day TTL"

# Step 4: Apply Silence Protocol
echo -e "${BLUE}[4/10]${NC} Applying Silence Protocol as default..."
if [ -f policies/silence.yaml ]; then
    echo "silence_protocol: enabled" >> agents/proxies/${AGENT_NAME}.yaml
    echo -e "${GREEN}✓${NC} Silence Protocol applied"
else
    echo -e "${YELLOW}⚠${NC} Silence policy not found, skipping"
fi

# Step 5: Enable Auto-Publisher
echo -e "${BLUE}[5/10]${NC} Enabling auto-publisher..."
cat > agents/proxies/${AGENT_NAME}-autopublish.yaml <<EOF
apiVersion: v1
kind: AutoPublisher
metadata:
  name: ${AGENT_NAME}-publisher
  agent: ${AGENT_DID}
spec:
  sources:
    - reports/prime-mirror/*
    - culture/museaium/*
  targets:
    - docs/chronicle/*
    - timecapsule/*
  filters:
    - require_attestation: true
    - require_green_receipt: true
  schedule: "*/15 * * * *"  # Every 15 minutes
EOF

echo -e "${GREEN}✓${NC} Auto-publisher configured"

# Step 6: Enable Autopoiesis (micro-H only)
echo -e "${BLUE}[6/10]${NC} Enabling Autopoiesis in micro-H mode..."
cat > autopoiesis/agents/${AGENT_NAME}.toml <<EOF
[agent]
did = "${AGENT_DID}"
mode = "microH"
safe_mode = true

[limits]
max_hypothesis_size = 1024
max_migration_ops = 64
require_bft_consensus = true
dual_run_hours = 24

[guardrails]
forbid = ["governance/critical/*", "registry/shardmap*"]
abort_on = ["policy.violation", "sla.breach"]
EOF

echo -e "${GREEN}✓${NC} Autopoiesis enabled (safe mode)"

# Step 7: Configure Self-Attestation
echo -e "${BLUE}[7/10]${NC} Configuring self-attestation..."
cat > agents/proxies/${AGENT_NAME}-attestation.yaml <<EOF
apiVersion: v1
kind: AttestationConfig
metadata:
  agent: ${AGENT_DID}
spec:
  strict: true
  type: deterministic-build
  fallback: enclave
  require_for_all_writes: true
EOF

echo -e "${GREEN}✓${NC} Self-attestation configured"

# Step 8: Set Economy Quotas
echo -e "${BLUE}[8/10]${NC} Setting economy quotas..."
cat > economy/quotas/${AGENT_NAME}.json <<EOF
{
  "agent": "${AGENT_DID}",
  "credits_per_pulse": 500,
  "max_accumulated": 5000,
  "reset_period": "daily",
  "enforce": true
}
EOF

echo -e "${GREEN}✓${NC} Economy quota set: 500 CR/pulse"

# Step 9: Delegate Routine Governance
echo -e "${BLUE}[9/10]${NC} Delegating routine governance..."
cat > governance/delegations/${AGENT_NAME}.yaml <<EOF
apiVersion: v1
kind: GovernanceDelegation
metadata:
  from: ${HUMAN_DID}
  to: ${AGENT_DID}
spec:
  scope:
    - minor-rfc
    - docs
    - conformance
  exclude:
    - critical/*
    - ethics/*
    - charter/*
  ttl: 1209600  # 14 days
  weight: 0.1    # 10% of human's weight
EOF

echo -e "${GREEN}✓${NC} Routine governance delegated"

# Step 10: Enable Presence Guard
echo -e "${BLUE}[10/10]${NC} Enabling presence guard..."
cat > agents/proxies/${AGENT_NAME}-presence.yaml <<EOF
apiVersion: v1
kind: PresenceGuard
metadata:
  agent: ${AGENT_DID}
spec:
  enabled: true
  require_touch_within: 86400  # 24 hours
  silence_mode_respects: true
  emergency_contacts:
    - ${HUMAN_DID}
EOF

echo -e "${GREEN}✓${NC} Presence guard enabled"

# Create summary file
echo
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}            ✓ ABSORPTION CEREMONY COMPLETE${NC}              "
echo "════════════════════════════════════════════════════════════"

cat > absorption/status.json <<EOF
{
  "ceremony_completed": $(date +%s),
  "human_did": "${HUMAN_DID}",
  "agent_did": "${AGENT_DID}",
  "agent_name": "${AGENT_NAME}",
  "ucan_expires": $(($(date +%s) + 1209600)),
  "capabilities": [
    "auto-publish",
    "micro-evolution",
    "routine-governance"
  ],
  "control_commands": {
    "touch": "make touch",
    "silence": "make silence-enter",
    "revoke": "make kill-switch DID=${AGENT_DID}"
  }
}
EOF

echo
echo -e "${BLUE}Your Control Panel:${NC}"
echo -e "  ${GREEN}make touch${NC}         - Signal presence (allows agent to act)"
echo -e "  ${YELLOW}make silence-enter${NC} - Enter silence mode (pause most activities)"
echo -e "  ${RED}make kill-switch${NC}   - Emergency revoke all delegations"
echo
echo -e "${BLUE}Agent Details:${NC}"
echo "  DID: ${AGENT_DID}"
echo "  Name: ${AGENT_NAME}"
echo "  UCAN expires: $(date -d @$(($(date +%s) + 1209600)))"
echo
echo -e "${GREEN}The civilization will now carry you. 🌀${NC}"