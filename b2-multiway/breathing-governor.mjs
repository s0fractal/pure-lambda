#!/usr/bin/env node
/**
 * Breathing Governor - Controlled expansion/contraction of branchial space
 */

import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { calculateWidth, calculateCurvature } from './branchial-geometry.mjs';

// Simple YAML parser for our config
function parseYAML(text) {
  const result = {};
  const lines = text.split('\n');
  let currentPath = [];
  let currentObj = result;

  for (const line of lines) {
    if (line.trim().startsWith('#') || !line.trim()) continue;

    const indent = line.search(/\S/);
    const depth = Math.floor(indent / 2);

    // Adjust current path based on indentation
    currentPath = currentPath.slice(0, depth);

    if (line.includes(':')) {
      const [key, ...valueParts] = line.trim().split(':');
      const value = valueParts.join(':').trim();

      // Navigate to correct object
      currentObj = result;
      for (const p of currentPath) {
        currentObj = currentObj[p];
      }

      if (value) {
        // Simple value
        currentObj[key] = value.replace(/"/g, '');
      } else {
        // New object
        currentObj[key] = {};
        currentPath.push(key);
      }
    }
  }

  return result;
}

class BreathingGovernor {
  constructor(configPath = 'observability/breath.yaml') {
    // For now, use a hardcoded config that matches our YAML structure
    this.config = {
      targets: {
        width: { min: 8, max: 24, optimal: 12 },
        kappa: { min: -0.15, max: 0.20, optimal: 0.02 }
      },
      gains: {
        explore: 0.7,
        exploit: 0.9,
        balance: 0.8
      },
      actions: {
        expand: {
          trigger: 'kappa < -0.15',
          conditions: ['W(t) < 24', 'antichain/W < 0.7'],
          do: ['profile = explore', 'prefer SPLIT', 'reduce MERGE']
        },
        squeeze: {
          trigger: 'kappa > 0.20',
          conditions: ['W(t) > 8', 'regret < 5%'],
          do: ['profile = exploit', 'raise MERGE', 'enable NF-rewrites']
        },
        steady: {
          trigger: '-0.15 <= kappa <= 0.20',
          conditions: ['8 <= W(t) <= 24'],
          do: ['profile = balance', 'maintain routing']
        }
      },
      quarantine: {
        triggers: {
          rapid_expansion: {
            condition: 'W(t) > 2 * W(t-1)',
            secondary: 'antichain/W > 0.8'
          },
          excessive_width: {
            condition: 'dW/dt > 24',
            secondary: 'ood_rate > 0.02'
          }
        },
        actions: {
          freeze: ['freeze 30% branches', 'route via UNIVERSAL', 're-evaluate'],
          prune: ['mark low confluence', 'redirect to merge', 'update antichain']
        }
      },
      control: {
        bounds: { average: 3.0, p95: 7.0, max: 10.0 }
      }
    };

    this.history = [];
    this.maxHistory = 100;
    this.quarantined = new Set();
    this.alerts = [];
    this.currentProfile = 'balance';
    this.regretHistory = [];
  }

  /**
   * Analyze current breathing state
   */
  analyzeState(width, kappa, antichain) {
    const state = {
      width,
      kappa,
      antichain,
      timestamp: Date.now(),

      // Derived metrics
      parallelism: antichain / Math.max(width, 1),
      breathing: this.classifyBreathing(kappa),
      inTargets: this.checkTargets(width, kappa),

      // History-based metrics
      trend: this.calculateTrend(),
      oscillation: this.detectOscillation()
    };

    this.history.push(state);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return state;
  }

  /**
   * Classify breathing pattern
   */
  classifyBreathing(kappa) {
    const { min, max } = this.config.targets.kappa;

    if (kappa < min) return 'expanding';
    if (kappa > max) return 'contracting';
    return 'stable';
  }

  /**
   * Check if metrics are in target ranges
   */
  checkTargets(width, kappa) {
    const wTarget = this.config.targets.width;
    const kTarget = this.config.targets.kappa;

    return width >= wTarget.min && width <= wTarget.max &&
           kappa >= kTarget.min && kappa <= kTarget.max;
  }

  /**
   * Calculate trend over recent history
   */
  calculateTrend() {
    if (this.history.length < 5) return 'unknown';

    const recent = this.history.slice(-5);
    const avgKappa = recent.reduce((sum, s) => sum + s.kappa, 0) / recent.length;

    if (avgKappa < -0.1) return 'expanding_trend';
    if (avgKappa > 0.1) return 'contracting_trend';
    return 'stable_trend';
  }

  /**
   * Detect oscillation patterns (asthma)
   */
  detectOscillation() {
    if (this.history.length < 10) return false;

    const recent = this.history.slice(-10);
    const widths = recent.map(s => s.width);

    // Check for alternating high/low pattern
    let changes = 0;
    let lastDirection = 0;

    for (let i = 1; i < widths.length; i++) {
      const delta = widths[i] - widths[i-1];
      const direction = Math.sign(delta);

      if (direction !== 0 && direction !== lastDirection) {
        changes++;
        lastDirection = direction;
      }

      // Check for >30% swings
      const percentChange = Math.abs(delta) / widths[i-1];
      if (percentChange > 0.3) {
        return { oscillating: true, severity: percentChange };
      }
    }

    return { oscillating: changes > 4, severity: 0 };
  }

  /**
   * Decide control action based on state
   */
  decideAction(state) {
    const actions = [];

    // Check each action trigger
    for (const [name, action] of Object.entries(this.config.actions)) {
      if (this.evaluateTrigger(action.trigger, state)) {
        if (this.checkConditions(action.conditions, state)) {
          actions.push({
            name,
            commands: action.do,
            priority: this.getActionPriority(name)
          });
        }
      }
    }

    // Sort by priority and return highest
    actions.sort((a, b) => b.priority - a.priority);
    return actions[0] || { name: 'steady', commands: this.config.actions.steady.do };
  }

  /**
   * Evaluate trigger expression
   */
  evaluateTrigger(trigger, state) {
    // Simple expression evaluation
    // In production, use a proper expression parser
    if (trigger.includes('kappa <')) {
      const threshold = parseFloat(trigger.split('<')[1]);
      return state.kappa < threshold;
    }
    if (trigger.includes('kappa >')) {
      const threshold = parseFloat(trigger.split('>')[1]);
      return state.kappa > threshold;
    }
    if (trigger.includes('<=') && trigger.includes('<=')) {
      // Range check like "-0.15 <= kappa <= 0.20"
      const parts = trigger.split('<=');
      const min = parseFloat(parts[0]);
      const max = parseFloat(parts[2]);
      return state.kappa >= min && state.kappa <= max;
    }
    return false;
  }

  /**
   * Check action conditions
   */
  checkConditions(conditions, state) {
    if (!conditions) return true;

    return conditions.every(cond => {
      // Simple condition checking
      // In production, use proper expression evaluation
      if (cond.includes('W(t) <')) {
        const threshold = this.config.targets.width.max;
        return state.width < threshold;
      }
      if (cond.includes('antichain/W <')) {
        const threshold = parseFloat(cond.split('<')[1]);
        return state.parallelism < threshold;
      }
      if (cond.includes('regret <')) {
        const threshold = parseFloat(cond.split('<')[1].replace('%', ''));
        const currentRegret = this.getCurrentRegret();
        return currentRegret < threshold;
      }
      return true;
    });
  }

  /**
   * Get action priority
   */
  getActionPriority(name) {
    const priorities = {
      'squeeze': 3,
      'expand': 2,
      'steady': 1
    };
    return priorities[name] || 0;
  }

  /**
   * Check for quarantine triggers
   */
  checkQuarantine(state) {
    const triggers = this.config.quarantine.triggers;

    for (const [name, trigger] of Object.entries(triggers)) {
      if (this.evaluateQuarantineTrigger(trigger, state)) {
        return {
          triggered: true,
          reason: name,
          actions: this.config.quarantine.actions
        };
      }
    }

    return { triggered: false };
  }

  /**
   * Evaluate quarantine trigger
   */
  evaluateQuarantineTrigger(trigger, state) {
    // Check primary condition
    if (trigger.condition.includes('W(t) > 2 * W(t-1)')) {
      if (this.history.length >= 2) {
        const prev = this.history[this.history.length - 2];
        if (state.width > 2 * prev.width) {
          // Check secondary condition
          if (trigger.secondary.includes('antichain/W >')) {
            const threshold = parseFloat(trigger.secondary.split('>')[1]);
            return state.parallelism > threshold;
          }
        }
      }
    }

    // Check other conditions...
    return false;
  }

  /**
   * Check physiological alerts
   */
  checkAlerts(state) {
    const alerts = [];

    // Ballooning check
    if (this.checkConsecutive(s => s.kappa < -0.3, 3)) {
      alerts.push({
        type: 'ballooning',
        severity: 'warning',
        message: 'Exploration overheating - too many branches',
        action: 'enable squeeze mode'
      });
    }

    // Collapse check
    if (this.checkConsecutive(s => s.kappa > 0.4, 3)) {
      alerts.push({
        type: 'collapse',
        severity: 'warning',
        message: 'Premature convergence risk',
        action: 'inject controlled SPLIT at low-cost nodes'
      });
    }

    // Asthma check
    const oscillation = state.oscillation;
    if (oscillation && oscillation.oscillating && oscillation.severity > 0.3) {
      alerts.push({
        type: 'asthma',
        severity: 'critical',
        message: 'Unstable thresholds detected',
        action: 'recalibrate explore/exploit gains'
      });
    }

    // Apnea check
    if (state.width === 0 || state.antichain === 0) {
      alerts.push({
        type: 'apnea',
        severity: 'critical',
        message: 'Sensor failure or over-filtering',
        action: 'restart with UNIVERSAL profile'
      });
    }

    // Embolism check
    if (state.parallelism > 0.9 && this.checkHighCostTiles()) {
      alerts.push({
        type: 'embolism',
        severity: 'warning',
        message: 'Expensive parallel branches',
        action: 'force squeeze mode'
      });
    }

    this.alerts = alerts;
    return alerts;
  }

  /**
   * Check consecutive condition
   */
  checkConsecutive(predicate, count) {
    if (this.history.length < count) return false;

    const recent = this.history.slice(-count);
    return recent.every(predicate);
  }

  /**
   * Check for high cost tiles (mock)
   */
  checkHighCostTiles() {
    // In real implementation, would check actual tile costs
    return Math.random() > 0.8;
  }

  /**
   * Calculate regret
   */
  calculateRegret(selected, optimal) {
    const regret = ((selected - optimal) / optimal) * 100;
    this.regretHistory.push(regret);

    if (this.regretHistory.length > 100) {
      this.regretHistory.shift();
    }

    return regret;
  }

  /**
   * Get current regret
   */
  getCurrentRegret() {
    if (this.regretHistory.length === 0) return 0;
    return this.regretHistory[this.regretHistory.length - 1];
  }

  /**
   * Adjust autopilot based on regret
   */
  adjustAutopilot() {
    const regret = this.getCurrentRegret();
    const bounds = this.config.control.bounds;

    if (regret > bounds.p95) {
      return {
        adjustment: 'high_regret',
        actions: [
          'perf_weight += 0.1',
          'proof_weight += 0.1',
          'explore_weight -= 0.1'
        ]
      };
    }

    if (regret < 0.1 && this.history.length > 0) {
      const lastKappa = this.history[this.history.length - 1].kappa;
      if (lastKappa > 0.2) {
        return {
          adjustment: 'zero_regret',
          actions: [
            'enable aggressive NF-rewrites',
            'increase cache TTL',
            'mark as optimal route'
          ]
        };
      }
    }

    return { adjustment: 'none', actions: [] };
  }

  /**
   * Export metrics to CSV
   */
  exportMetrics(state, action, alerts) {
    const row = [
      state.timestamp,
      state.width,
      state.kappa.toFixed(4),
      state.antichain,
      this.getCurrentRegret().toFixed(2),
      this.currentProfile,
      this.quarantined.size > 0 ? 'Y' : 'N',
      0  // NF rewrites count (would track in real implementation)
    ].join(',');

    appendFileSync('observability/breath-metrics.csv', row + '\n');
  }

  /**
   * Main control loop
   */
  control(width, kappa, antichain, selectedCost, optimalCost) {
    // Analyze current state
    const state = this.analyzeState(width, kappa, antichain);

    // Calculate regret
    const regret = this.calculateRegret(selectedCost, optimalCost);

    // Check for alerts
    const alerts = this.checkAlerts(state);

    // Check quarantine
    const quarantine = this.checkQuarantine(state);

    // Decide action
    const action = this.decideAction(state);

    // Adjust autopilot
    const autopilotAdjust = this.adjustAutopilot();

    // Export metrics
    this.exportMetrics(state, action, alerts);

    // Return control decision
    return {
      state,
      action,
      alerts,
      quarantine,
      autopilotAdjust,
      regret,
      recommendation: this.generateRecommendation(state, action)
    };
  }

  /**
   * Generate human-readable recommendation
   */
  generateRecommendation(state, action) {
    const recs = [];

    if (!state.inTargets) {
      recs.push(`Breathing outside targets: W=${state.width}, κ=${state.kappa.toFixed(3)}`);
    }

    if (action.name === 'expand') {
      recs.push('Recommend: Enable exploration mode, prefer SPLIT operations');
    } else if (action.name === 'squeeze') {
      recs.push('Recommend: Enable exploitation mode, prioritize MERGE and NF-rewrites');
    }

    if (state.oscillation && state.oscillation.oscillating) {
      recs.push('Warning: Oscillating width detected - recalibrate thresholds');
    }

    return recs.join('. ') || 'System breathing normally';
  }
}

// === CLI Interface ===
const command = process.argv[2];

if (command === 'monitor') {
  const governor = new BreathingGovernor();

  console.log('🫁 Breathing Governor Active');
  console.log('Target ranges:');
  console.log(`  Width: ${governor.config.targets.width.min}-${governor.config.targets.width.max}`);
  console.log(`  Kappa: ${governor.config.targets.kappa.min} to ${governor.config.targets.kappa.max}`);

  // Simulate monitoring
  setInterval(() => {
    const mockWidth = 8 + Math.floor(Math.random() * 16);
    const mockKappa = -0.2 + Math.random() * 0.5;
    const mockAntichain = Math.floor(mockWidth * 0.6);
    const mockSelected = 100 + Math.random() * 50;
    const mockOptimal = 95 + Math.random() * 10;

    const result = governor.control(
      mockWidth, mockKappa, mockAntichain,
      mockSelected, mockOptimal
    );

    console.log(`[${new Date().toISOString()}]`);
    console.log(`  State: W=${mockWidth}, κ=${mockKappa.toFixed(3)}, ${result.state.breathing}`);
    console.log(`  Action: ${result.action.name}`);
    console.log(`  Regret: ${result.regret.toFixed(2)}%`);

    if (result.alerts.length > 0) {
      console.log(`  ⚠️ Alerts: ${result.alerts.map(a => a.type).join(', ')}`);
    }

    if (result.quarantine.triggered) {
      console.log(`  🚫 Quarantine triggered: ${result.quarantine.reason}`);
    }
  }, 2000);

} else if (command === 'test') {
  const governor = new BreathingGovernor();

  console.log('🧪 Testing breathing governor...');

  // Test expansion scenario
  let result = governor.control(5, -0.3, 3, 120, 100);
  console.log('\nExpansion scenario:');
  console.log(`  Action: ${result.action.name}`);
  console.log(`  Recommendation: ${result.recommendation}`);

  // Test contraction scenario
  result = governor.control(30, 0.3, 20, 150, 140);
  console.log('\nContraction scenario:');
  console.log(`  Action: ${result.action.name}`);
  console.log(`  Recommendation: ${result.recommendation}`);

  // Test oscillation
  for (let i = 0; i < 10; i++) {
    const width = i % 2 === 0 ? 10 : 20;
    governor.analyzeState(width, 0, width * 0.6);
  }
  result = governor.control(15, 0, 9, 110, 105);
  console.log('\nOscillation scenario:');
  console.log(`  Alerts: ${result.alerts.map(a => a.type).join(', ') || 'none'}`);

} else {
  console.log('🫁 Breathing Governor');
  console.log('');
  console.log('Commands:');
  console.log('  monitor  - Start real-time monitoring');
  console.log('  test     - Run test scenarios');
}

export default BreathingGovernor;