---
contract: v0
type: self-evolution-charter
issuer: ${HUMAN_DID}
assignee: ${AGENT_DID}
signed: ${TIMESTAMP}

intent:
  goal: "MicroH proposals and migrations within SAFE bounds"
  description: |
    Permits the proxy agent to propose and implement micro-evolutions
    (small, safe improvements) through the Autopoiesis Engine, with
    strict safety constraints and dual-run verification.

  outputs:
    - autopoiesis/microH/*
    - governance/receipts/*
    - evolution/reports/*

policies:
  - autopoiesis.safe_only
  - economy.cap_fairshare
  - evolution.reversible
  - consensus.bft_required

capabilities:
  read:
    - genome/*
    - formal/invariants/*
    - autopoiesis/history/*

  write:
    - autopoiesis/microH/proposals/*
    - autopoiesis/microH/results/*
    - evolution/snapshots/*

  execute:
    - autopoiesis/propose
    - autopoiesis/test
    - autopoiesis/migrate

evolution_constraints:
  microH_only:
    max_change_size: 1024  # bytes
    max_affected_genes: 3
    require_backward_compatible: true

  forbidden_changes:
    - core_invariants
    - security_policies
    - consensus_mechanism
    - economic_model

  testing_requirements:
    min_test_coverage: 0.95
    property_tests_required: true
    dual_run_hours: 24
    rollback_window: 72  # hours

guardrails:
  require_bft_consensus_for:
    - autopoiesis/migrate
    - governance/receipts/*

  abort_conditions:
    - policy.violation
    - sla.breach
    - test.failure
    - invariant.violation

  safe_mode:
    enabled: true
    max_hypothesis_per_day: 5
    cooldown_between_migrations: 21600  # 6 hours

verification:
  pre_migration:
    - all_tests_pass
    - invariants_preserved
    - dual_run_successful
    - bft_consensus_achieved

  post_migration:
    - health_checks_pass
    - no_regression_detected
    - receipts_generated

  continuous:
    - monitor_error_rates
    - track_performance_metrics
    - verify_determinism

rollback:
  automatic_if:
    - error_rate > 0.01
    - performance_degradation > 10%
    - consensus_lost

  manual_trigger: ${HUMAN_DID}
  snapshot_before_migration: true
  max_rollback_time: 300  # seconds

economic:
  budget_per_evolution: 1000  # credits
  reward_successful_evolution: 100
  penalty_failed_evolution: -500

audit:
  record_all:
    - hypotheses
    - test_results
    - migration_logs
    - rollback_events

  retain_for: 365  # days

reporting:
  notify_human_on:
    - migration_started
    - migration_completed
    - rollback_triggered
    - anomaly_detected

  summary_frequency: daily

---

# Self-Evolution Charter

This charter grants the proxy agent limited authority to evolve the system through micro-hypotheses.

## What This Allows

✅ Proposing small, safe improvements (microH)
✅ Testing hypotheses in isolation
✅ Implementing migrations with dual-run verification
✅ Generating evolution reports and receipts

## What This Prevents

❌ Changing core invariants
❌ Modifying security policies
❌ Large-scale migrations
❌ Evolution without consensus

## Safety Mechanisms

1. **MicroH Only**: Changes limited to 1KB affecting ≤3 genes
2. **Dual Run**: 24-hour parallel execution before migration
3. **BFT Consensus**: Requires agreement before migration
4. **Automatic Rollback**: Reverts on any violation

## Evolution Process

```
Hypothesis → Test → Dual Run → BFT Vote → Migrate → Monitor
    ↓         ↓        ↓          ↓          ↓         ↓
  Reject   Fail    Diverge    No Consensus  Rollback  Alert
```

## Monitoring

Track evolution through:
- `/autopoiesis/microH/` - Current hypotheses
- `/governance/receipts/` - Migration approvals
- `/evolution/reports/` - Detailed outcomes

## Economic Model

- Each evolution costs up to 1000 CR
- Successful evolution rewards 100 CR
- Failed evolution penalties -500 CR
- This incentivizes careful, valuable improvements

## Duration

Valid for 14 days, renewable. The system learns from each evolution cycle.

---

*Through small steps, the system grows wiser while remaining true to its core nature.*