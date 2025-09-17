#!/usr/bin/env node
// Guard functions for safe Oracle apply with ±10% limits

export function healthy({ trust, dsse, dedupe }) {
  return trust >= 96 && dsse === 100 && dedupe <= 1;
}

export function clamp(patch, { eps, weights }) {
  // Clamp epsilon delta to safe range
  if (patch.bandit?.epsDelta) {
    patch.bandit.epsDelta = Math.max(eps.minDelta, Math.min(eps.maxDelta, patch.bandit.epsDelta));
  }

  // Clamp weight adjustments
  for (const k of Object.keys(patch.weights || {})) {
    patch.weights[k] = Math.max(-weights.maxAbs, Math.min(weights.maxAbs, patch.weights[k]));
  }

  return patch;
}

export function scheduleGuardRollback({ burn, ttq, window }) {
  // Schedule automatic rollback if metrics degrade
  const rollbackPlan = {
    trigger: {
      burn_threshold: burn,
      ttq_threshold: ttq,
      window_cycles: window
    },
    scheduled_at: new Date().toISOString(),
    status: "armed"
  };

  return rollbackPlan;
}