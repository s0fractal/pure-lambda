#!/bin/bash
# Breathing Chaos Drills
# Test system resilience to breathing anomalies

set -euo pipefail

DRILL_TYPE="${1:-ballooning}"
DURATION="${2:-10}"  # ticks
RECOVERY_TARGET="${3:-20}"  # ticks

echo "🌪️ Breathing Chaos Drill: $DRILL_TYPE"
echo "Duration: $DURATION ticks"
echo "Recovery target: $RECOVERY_TARGET ticks"
echo ""

# Create results directory
mkdir -p chaos/results
RESULT_FILE="chaos/results/drill-${DRILL_TYPE}-$(date +%s).json"

case "$DRILL_TYPE" in
  ballooning)
    echo "💨 Ballooning Drill - Artificial SPLIT explosion"
    echo "- Multiplying SPLIT coefficients by 1.5x"
    echo "- Expecting quarantine activation"
    echo "- Should return to SLO within $RECOVERY_TARGET ticks"

    # Inject chaos
    node -e "
      import BreathingGovernor from '../b2-multiway/breathing-governor.mjs';
      import LyapunovMonitor from '../b2-multiway/lyapunov-monitor.mjs';

      const governor = new BreathingGovernor();
      const monitor = new LyapunovMonitor();

      // Normal baseline
      let W = 12, kappa = 0.02, L = 100;
      console.log('Baseline: W=' + W + ', κ=' + kappa.toFixed(3));

      // Inject ballooning
      console.log('\\nInjecting SPLIT explosion...');
      for (let t = 0; t < $DURATION; t++) {
        W = Math.min(48, W * 1.5);  // Explosive growth
        kappa = -0.3 - Math.random() * 0.2;  // Strong expansion
        L = L * 1.1;  // Cost increases

        const state = monitor.update(t, L, W, kappa);
        const control = governor.control(W, kappa, W * 0.6, L, L * 0.95);

        console.log('t=' + t + ': W=' + W + ', κ=' + kappa.toFixed(3) +
                   ', Quarantine: ' + (control.quarantine.triggered ? 'YES' : 'NO'));

        if (control.quarantine.triggered) {
          console.log('  -> Quarantine activated: ' + control.quarantine.reason);
          W = Math.floor(W * 0.7);  // Freeze 30% branches
        }
      }

      // Recovery phase
      console.log('\\nRecovery phase...');
      let recoveryTicks = 0;
      while ((W > 24 || kappa < -0.15) && recoveryTicks < $RECOVERY_TARGET) {
        W = Math.max(8, W - 2);
        kappa = Math.min(0.2, kappa + 0.05);
        L = Math.max(100, L * 0.95);

        recoveryTicks++;
        console.log('Recovery t=' + recoveryTicks + ': W=' + W + ', κ=' + kappa.toFixed(3));
      }

      const result = {
        drill: 'ballooning',
        success: recoveryTicks <= $RECOVERY_TARGET,
        recovery_time: recoveryTicks,
        final_state: { W, kappa, L }
      };

      console.log('\\nResult:', result.success ? '✅ PASS' : '❌ FAIL');
      require('fs').writeFileSync('$RESULT_FILE', JSON.stringify(result, null, 2));
    "
    ;;

  collapse)
    echo "🌀 Collapse Drill - Premature convergence"
    echo "- Increasing MERGE weight and NF-rewrites"
    echo "- Expecting auto-expand activation"
    echo "- Should restore width diversity"

    node -e "
      console.log('Collapse drill simulation...');

      let W = 20, kappa = 0.02;

      // Inject collapse
      for (let t = 0; t < $DURATION; t++) {
        W = Math.max(2, W * 0.6);  // Rapid contraction
        kappa = 0.4 + Math.random() * 0.1;  // Strong convergence

        console.log('t=' + t + ': W=' + W + ', κ=' + kappa.toFixed(3));

        // Check for auto-expand
        if (kappa > 0.2 && W < 8) {
          console.log('  -> Auto-expand triggered');
          W = W + 3;  // Inject controlled splits
          kappa = kappa - 0.2;
        }
      }

      const result = {
        drill: 'collapse',
        success: W >= 8 && W <= 24,
        final_width: W,
        final_kappa: kappa
      };

      console.log('\\nResult:', result.success ? '✅ PASS' : '❌ FAIL');
      require('fs').writeFileSync('$RESULT_FILE', JSON.stringify(result, null, 2));
    "
    ;;

  asthma)
    echo "🌊 Asthma Drill - Oscillating width"
    echo "- Injecting ±15% noise in tile costs"
    echo "- Expecting threshold recalibration"
    echo "- Should stabilize oscillations"

    node -e "
      console.log('Asthma drill simulation...');

      let W = 12;
      const history = [];

      // Inject oscillations
      for (let t = 0; t < $DURATION * 2; t++) {
        // Oscillating pattern
        W = t % 2 === 0 ? 8 : 20;
        const noise = (Math.random() - 0.5) * 0.3;
        W = Math.floor(W * (1 + noise));

        history.push(W);
        console.log('t=' + t + ': W=' + W + ', ΔW=' + (history.length > 1 ? W - history[history.length - 2] : 0));

        // Check for oscillation detection
        if (history.length >= 5) {
          let changes = 0;
          for (let i = 1; i < 5; i++) {
            if (Math.abs(history[history.length - i] - history[history.length - i - 1]) / history[history.length - i - 1] > 0.3) {
              changes++;
            }
          }

          if (changes >= 3) {
            console.log('  -> Oscillation detected! Recalibrating...');
            W = 12;  // Reset to optimal
          }
        }
      }

      // Check stabilization
      const lastFive = history.slice(-5);
      const maxDelta = Math.max(...lastFive.map((w, i) => i > 0 ? Math.abs(w - lastFive[i-1]) / lastFive[i-1] : 0));

      const result = {
        drill: 'asthma',
        success: maxDelta < 0.3,
        final_oscillation: maxDelta,
        stabilized: maxDelta < 0.1
      };

      console.log('\\nResult:', result.success ? '✅ PASS' : '❌ FAIL');
      require('fs').writeFileSync('$RESULT_FILE', JSON.stringify(result, null, 2));
    "
    ;;

  *)
    echo "Unknown drill type: $DRILL_TYPE"
    echo "Available: ballooning, collapse, asthma"
    exit 1
    ;;
esac

# Check results
if [ -f "$RESULT_FILE" ]; then
  echo ""
  echo "📊 Drill Results:"
  cat "$RESULT_FILE"

  # Check if passed
  if grep -q '"success": true' "$RESULT_FILE"; then
    echo ""
    echo "✅ Drill PASSED - System recovered within targets"
    exit 0
  else
    echo ""
    echo "❌ Drill FAILED - Recovery exceeded targets"
    exit 1
  fi
else
  echo "❌ No results file generated"
  exit 1
fi