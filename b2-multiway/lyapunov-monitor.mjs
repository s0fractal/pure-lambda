#!/usr/bin/env node
/**
 * Lyapunov Energy Monitor
 * Tracks system stability via potential function Φ
 */

import { readFileSync, writeFileSync, appendFileSync } from 'fs';

class LyapunovMonitor {
  constructor() {
    // Coefficients for potential function
    this.α = 10.0;   // Width penalty
    this.β = 50.0;   // Upper curvature penalty
    this.γ = 50.0;   // Lower curvature penalty

    // Target ranges
    this.Wmax = 24;
    this.Wmin = 8;
    this.κmax = 0.20;
    this.κmin = -0.15;

    // History for stability tracking
    this.history = [];
    this.maxHistory = 128;
    this.csvPath = 'monitoring/phi-energy.csv';

    // Initialize CSV
    this.initCSV();
  }

  /**
   * Initialize CSV file with headers
   */
  initCSV() {
    const headers = 'timestamp,tick,L,W,kappa,phi,delta_phi,stable,violations\n';
    writeFileSync(this.csvPath, headers);
  }

  /**
   * Calculate potential energy Φ
   */
  calculatePotential(L, W, κ) {
    const widthPenalty = this.α * Math.max(0, W - this.Wmax);
    const upperCurvaturePenalty = this.β * Math.max(0, κ - this.κmax);
    const lowerCurvaturePenalty = this.γ * Math.max(0, this.κmin - κ);

    const Φ = L + widthPenalty + upperCurvaturePenalty + lowerCurvaturePenalty;

    return {
      Φ,
      components: {
        L,
        widthPenalty,
        upperCurvaturePenalty,
        lowerCurvaturePenalty
      }
    };
  }

  /**
   * Update monitor with new state
   */
  update(tick, L, W, κ) {
    const potential = this.calculatePotential(L, W, κ);

    // Calculate ΔΦ
    let ΔΦ = 0;
    if (this.history.length > 0) {
      const prev = this.history[this.history.length - 1];
      ΔΦ = potential.Φ - prev.Φ;
    }

    // Check violations
    const violations = [];
    if (W < this.Wmin || W > this.Wmax) violations.push('W_out_of_range');
    if (κ < this.κmin || κ > this.κmax) violations.push('κ_out_of_range');
    if (ΔΦ > 0) violations.push('Φ_increasing');

    // Create state record
    const state = {
      timestamp: Date.now(),
      tick,
      L,
      W,
      κ,
      Φ: potential.Φ,
      ΔΦ,
      stable: ΔΦ <= 0,
      violations,
      components: potential.components
    };

    // Update history
    this.history.push(state);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Export to CSV
    this.exportToCSV(state);

    return state;
  }

  /**
   * Export state to CSV
   */
  exportToCSV(state) {
    const row = [
      state.timestamp,
      state.tick,
      state.L.toFixed(2),
      state.W,
      state.κ.toFixed(4),
      state.Φ.toFixed(2),
      state.ΔΦ.toFixed(3),
      state.stable ? 'Y' : 'N',
      state.violations.join(';') || 'none'
    ].join(',') + '\n';

    appendFileSync(this.csvPath, row);
  }

  /**
   * Check stability over window
   */
  checkStability(window = 32) {
    if (this.history.length < window) {
      return { stable: false, reason: 'insufficient_data' };
    }

    const recent = this.history.slice(-window);
    const stableCount = recent.filter(s => s.stable).length;
    const stabilityRatio = stableCount / window;

    // Check if Φ is decreasing overall
    const startΦ = recent[0].Φ;
    const endΦ = recent[recent.length - 1].Φ;
    const overallDecrease = endΦ <= startΦ;

    // Check for divergence (>10% increase)
    const maxΦ = Math.max(...recent.map(s => s.Φ));
    const divergence = (maxΦ - startΦ) / startΦ;

    return {
      stable: stabilityRatio >= 0.95 && overallDecrease,
      stabilityRatio,
      overallChange: ((endΦ - startΦ) / startΦ * 100).toFixed(2) + '%',
      divergence: divergence > 0.1,
      violations: this.countViolations(recent)
    };
  }

  /**
   * Count violations in window
   */
  countViolations(window) {
    const counts = {};

    for (const state of window) {
      for (const violation of state.violations) {
        counts[violation] = (counts[violation] || 0) + 1;
      }
    }

    return counts;
  }

  /**
   * Generate stability report
   */
  report() {
    const stability = this.checkStability();
    const recent = this.history.slice(-10);

    return {
      current: recent[recent.length - 1] || null,
      stability,
      trend: this.calculateTrend(),
      averages: this.calculateAverages(),
      recommendations: this.generateRecommendations(stability)
    };
  }

  /**
   * Calculate energy trend
   */
  calculateTrend() {
    if (this.history.length < 10) return 'unknown';

    const recent = this.history.slice(-10);
    const ΔΦs = recent.map(s => s.ΔΦ);
    const avgΔΦ = ΔΦs.reduce((a, b) => a + b, 0) / ΔΦs.length;

    if (avgΔΦ < -0.1) return 'converging';
    if (avgΔΦ > 0.1) return 'diverging';
    return 'stable';
  }

  /**
   * Calculate averages
   */
  calculateAverages() {
    if (this.history.length === 0) return null;

    const recent = this.history.slice(-Math.min(32, this.history.length));

    return {
      avgΦ: (recent.reduce((sum, s) => sum + s.Φ, 0) / recent.length).toFixed(2),
      avgL: (recent.reduce((sum, s) => sum + s.L, 0) / recent.length).toFixed(2),
      avgW: (recent.reduce((sum, s) => sum + s.W, 0) / recent.length).toFixed(1),
      avgκ: (recent.reduce((sum, s) => sum + s.κ, 0) / recent.length).toFixed(4)
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(stability) {
    const recs = [];

    if (stability.divergence) {
      recs.push('⚠️ Energy diverging - reduce exploration');
    }

    const violations = stability.violations;
    if (violations.W_out_of_range > 5) {
      recs.push('Adjust width targets or enable stronger quarantine');
    }
    if (violations.κ_out_of_range > 5) {
      recs.push('Recalibrate curvature gains');
    }
    if (violations.Φ_increasing > 10) {
      recs.push('System unstable - consider PL_POLICY=universal');
    }

    if (recs.length === 0 && stability.stable) {
      recs.push('✅ System stable within Lyapunov bounds');
    }

    return recs;
  }
}

// === CLI Interface ===
const command = process.argv[2];

if (command === 'monitor') {
  const monitor = new LyapunovMonitor();

  console.log('📊 Lyapunov Energy Monitor Active');
  console.log(`Φ = L + ${monitor.α}·W_penalty + ${monitor.β}·κ_upper + ${monitor.γ}·κ_lower`);
  console.log('');

  let tick = 0;

  // Simulate monitoring
  setInterval(() => {
    // Generate mock data (in production, would get from actual system)
    const L = 100 + Math.random() * 50;
    const W = 8 + Math.floor(Math.random() * 20);
    const κ = -0.2 + Math.random() * 0.5;

    const state = monitor.update(tick++, L, W, κ);

    console.log(`[t=${tick}] Φ=${state.Φ.toFixed(2)} ΔΦ=${state.ΔΦ.toFixed(3)} ${
      state.stable ? '✅' : '❌'
    } | W=${W} κ=${κ.toFixed(3)} | ${state.violations.join(', ') || 'OK'}`);

    // Check stability every 32 ticks
    if (tick % 32 === 0) {
      const stability = monitor.checkStability();
      console.log('');
      console.log(`📈 Stability Check: ${stability.stable ? 'STABLE' : 'UNSTABLE'}`);
      console.log(`   Ratio: ${(stability.stabilityRatio * 100).toFixed(1)}%`);
      console.log(`   Change: ${stability.overallChange}`);
      console.log('');
    }
  }, 500);

} else if (command === 'analyze') {
  // Analyze existing CSV
  const monitor = new LyapunovMonitor();

  // Load some test data
  for (let i = 0; i < 100; i++) {
    const L = 100 + Math.sin(i * 0.1) * 30;
    const W = 12 + Math.sin(i * 0.05) * 8;
    const κ = Math.sin(i * 0.08) * 0.2;

    monitor.update(i, L, W, κ);
  }

  const report = monitor.report();
  console.log('📊 Lyapunov Analysis Report');
  console.log(JSON.stringify(report, null, 2));

} else {
  console.log('📊 Lyapunov Energy Monitor');
  console.log('');
  console.log('Commands:');
  console.log('  monitor  - Start real-time monitoring');
  console.log('  analyze  - Analyze stability from history');
  console.log('');
  console.log('Potential function:');
  console.log('  Φ = L(route) + penalties');
  console.log('  Stable when ΔΦ ≤ 0 in 95% of window');
}

export default LyapunovMonitor;