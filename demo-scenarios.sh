#!/bin/bash
# Demo scenarios showing lattice control in action

echo "🎭 DEMO SCENARIOS"
echo "================="
echo ""

# Demo 1: Pure function → Apex
echo "📍 Scenario 1: Hello Apex (pure computation)"
echo "Command: node -e 'console.log([1,2,3].map(x => x * 2))'"
echo ""

node cli/pl-studio.mjs proof "node -e 'console.log([1,2,3].map(x => x * 2))'"

echo ""
echo "─────────────────"
echo ""

# Demo 2: OOD injection → Universal
echo "📍 Scenario 2: Hello OOD (alien attributes)"
echo "Injecting alien attributes: alien:x, alien:y"
echo ""

# Create test with alien attributes
cat > /tmp/test-ood.js << 'EOF'
const { decide } = require('./fractal-lattice/lattice-control');

const alienReceipt = {
  attributes: [
    'type:validation',
    'exec:success',
    'oracle:no_fs',
    'alien:x',
    'alien:y',
    'unknown:attribute'
  ]
};

const decision = decide(alienReceipt.attributes);
console.log('Decision with alien attributes:');
console.log('  Profile:', decision.profile);
console.log('  Confidence:', decision.confidence.toFixed(2));
console.log('  Reason:', decision.reason || 'High confidence match');
EOF

node /tmp/test-ood.js

echo ""
echo "─────────────────"
echo ""

# Demo 3: Side effects → Universal (safety gate)
echo "📍 Scenario 3: Side effects trigger Gate #0"
echo "Command: cat /etc/hosts | head -1"
echo ""

node cli/pl-studio.mjs proof "cat /etc/hosts | head -1"

echo ""
echo "─────────────────"
echo ""

# Demo 4: Show current metrics
echo "📍 Scenario 4: Current system metrics"
echo ""
make lattice-status

echo ""
echo "================="
echo "✅ DEMO COMPLETE"
echo ""
echo "Key observations:"
echo "  • Pure functions → apex profile (MEMO+PAR enabled)"
echo "  • Unknown attributes → degraded confidence"
echo "  • Side effects → universal profile (safety gate)"
echo "  • System stable with J=1.0"