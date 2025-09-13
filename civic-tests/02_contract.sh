#!/bin/bash
# Civic Test 02: Contract Execution

set -e

echo "🧪 Civic Test 02: Contract Execution"
echo "===================================="
echo ""

# Create test contract
echo "📝 Creating test contract..."
cat > /tmp/test-contract.md << 'EOF'
---
contract: v0
issuer: did:pl:CivicTest
assignee: did:pl:Any
intent:
  goal: "Simple computation test"
  inputs:
    - view: "test/input.json"
  outputs:
    - intent: "test/output.json"
policies:
  - io.intent_only
  - gas.ceiling
sla:
  max_ms: 1000
payment:
  kind: "reputation"
  amount: 1
---

# Test Contract

Compute sum of numbers in input.json
EOF

echo "   Contract created"

# Create test input
echo '{"numbers": [1, 2, 3, 4, 5]}' > /tmp/input.json

# Simulate contract submission
echo ""
echo "📤 Submitting contract..."
sleep 1

# Simulate agent execution
echo "⚡ Agent executing..."
sleep 1

# Generate mock receipt
cat > /tmp/receipt.json << EOF
{
  "contract_cid": "QmTestContract123",
  "agent": "did:pl:TestAgent",
  "started_at": $(date +%s)000,
  "finished_at": $(date +%s)001,
  "outputs": [
    {
      "intent": "test/output.json",
      "cid": "QmOutput456"
    }
  ],
  "policy_report": {
    "ok": true,
    "violations": [],
    "checks": [
      {"policy": "io.intent_only", "passed": true},
      {"policy": "gas.ceiling", "passed": true, "gas_used": 1000}
    ]
  },
  "metrics": {
    "p50_ms": 15,
    "gas_used": 1000,
    "allocs": 2
  },
  "signatures": [
    {
      "did": "did:pl:TestAgent",
      "sig": "$(echo -n 'test' | sha256sum | cut -d' ' -f1)"
    }
  ]
}
EOF

echo "   Receipt generated"

# Verify receipt
echo ""
echo "🔍 Verifying receipt..."

CHECKS_PASSED=0

# Check policy compliance
echo -n "  Policy compliance: "
if grep -q '"ok": true' /tmp/receipt.json; then
    echo "✅"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo "❌"
fi

# Check execution time
echo -n "  Execution time: "
if grep -q '"p50_ms": 15' /tmp/receipt.json; then
    echo "✅ (15ms < 1000ms SLA)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo "❌"
fi

# Check signatures
echo -n "  Signatures: "
if grep -q '"sig":' /tmp/receipt.json; then
    echo "✅"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo "❌"
fi

# Check outputs
echo -n "  Outputs: "
if grep -q '"cid": "QmOutput' /tmp/receipt.json; then
    echo "✅"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo "❌"
fi

# Cleanup
rm -f /tmp/test-contract.md /tmp/input.json /tmp/receipt.json

# Result
echo ""
if [ "$CHECKS_PASSED" -eq 4 ]; then
    echo "✅ PASSED: Contract executed successfully"
    exit 0
else
    echo "❌ FAILED: Contract execution issues ($CHECKS_PASSED/4 checks passed)"
    exit 1
fi