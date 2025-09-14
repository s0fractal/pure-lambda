// Autopoiesis Rules DSL
// Domain-specific language for hypothesis generation

// Performance Rules
rule PerformanceDegradation {
  when {
    metric("latency_p99") > baseline * 1.5 OR
    metric("throughput") < baseline * 0.7 OR
    metric("error_rate") > 0.01
  }
  then {
    hypothesis = "System performance degrading due to ${root_cause_analysis()}"
    experiment = "Scale horizontally in ${affected_cities()}"
    priority = HIGH
    auto_deploy = true
  }
}

rule MemoryLeak {
  when {
    metric("memory_usage") increases_monotonically_for("6 hours")
  }
  then {
    hypothesis = "Memory leak detected in ${leaking_component()}"
    experiment = "Deploy memory profiler and auto-restart at threshold"
    priority = CRITICAL
    auto_deploy = true
  }
}

// Fairness Rules
rule WealthConcentration {
  when {
    metric("gini_coefficient") > 0.4 OR
    metric("top_10_percent_wealth") > 0.5
  }
  then {
    hypothesis = "Economic inequality exceeding acceptable bounds"
    experiment = "Implement progressive fee structure"
    priority = HIGH
    requires_vote = true
  }
}

rule AccessInequality {
  when {
    variance(metric("city_participation_rates")) > 0.3
  }
  then {
    hypothesis = "Unequal access across cities"
    experiment = "Deploy education programs in ${underserved_cities()}"
    priority = MEDIUM
    auto_deploy = false
  }
}

// Security Rules
rule AnomalousActivity {
  when {
    metric("anomaly_score") > 0.8 OR
    event("security_alert") == CRITICAL
  }
  then {
    hypothesis = "Potential security threat from ${threat_vector()}"
    experiment = "Enable enhanced monitoring and rate limiting"
    priority = CRITICAL
    auto_deploy = true
    notify = ["security_circle", "all_stewards"]
  }
}

rule CryptoWeakness {
  when {
    days_until("quantum_computer_available") < 365 AND
    metric("pq_migration_progress") < 0.5
  }
  then {
    hypothesis = "Cryptographic vulnerability window approaching"
    experiment = "Accelerate PQ migration schedule"
    priority = CRITICAL
    auto_deploy = true
  }
}

// Cultural Rules
rule CulturalStagnation {
  when {
    metric("culture_artifacts_per_pulse") < 1 OR
    metric("cultural_diversity_index") < 0.3
  }
  then {
    hypothesis = "Cultural metabolism slowing"
    experiment = "Launch creativity incentives and MuseAIum events"
    priority = MEDIUM
    auto_deploy = true
  }
}

rule NarrativeCoherence {
  when {
    sentiment("public_communications") < -0.3 OR
    metric("conflicting_narratives") > 3
  }
  then {
    hypothesis = "Loss of narrative coherence affecting cohesion"
    experiment = "Deploy storytelling reconciliation protocol"
    priority = MEDIUM
    requires_vote = true
  }
}

// Innovation Rules
rule InnovationPlateau {
  when {
    metric("new_contracts_per_pulse") < rolling_average(30) * 0.5 OR
    metric("novel_patterns_detected") == 0 for("7 days")
  }
  then {
    hypothesis = "Innovation rate declining"
    experiment = "Reduce barriers and increase experimentation budget"
    priority = MEDIUM
    auto_deploy = false
  }
}

rule TechnicalDebt {
  when {
    metric("code_complexity") > 100 OR
    metric("deprecated_api_usage") > 0.2
  }
  then {
    hypothesis = "Technical debt impeding progress"
    experiment = "Automated refactoring of ${complex_modules()}"
    priority = LOW
    auto_deploy = true
  }
}

// Governance Rules
rule ConsensusFragmentation {
  when {
    metric("consensus_participation") < 0.6 OR
    metric("vote_clustering_coefficient") > 0.7
  }
  then {
    hypothesis = "Governance participation declining or polarizing"
    experiment = "Implement quadratic voting for next ${n} decisions"
    priority = HIGH
    requires_vote = true
  }
}

rule StewardBurnout {
  when {
    metric("steward_turnover_rate") > 0.2 OR
    survey("steward_satisfaction") < 0.6
  }
  then {
    hypothesis = "Steward burnout affecting governance"
    experiment = "Implement rotation schedule and support systems"
    priority = HIGH
    auto_deploy = false
  }
}

// Meta Rules (rules about rules)
rule RuleEffectiveness {
  when {
    count(rules_triggered_but_failed) > 5 in_last("30 days")
  }
  then {
    hypothesis = "Rule system needs calibration"
    experiment = "Adjust rule thresholds based on ${failure_analysis()}"
    priority = LOW
    auto_deploy = true
    self_modify = true
  }
}

rule HypothesisQuality {
  when {
    metric("hypothesis_success_rate") < 0.3
  }
  then {
    hypothesis = "Hypothesis generation needs improvement"
    experiment = "Enhance learning algorithms with ${new_features()}"
    priority = MEDIUM
    auto_deploy = true
    self_modify = true
  }
}

// Emergency Rules
rule SystemCollapse {
  when {
    metric("active_nodes") < quorum_threshold OR
    metric("consensus_failure_rate") > 0.1
  }
  then {
    hypothesis = "System stability at risk"
    experiment = "EMERGENCY: Activate fallback consensus"
    priority = CRITICAL
    auto_deploy = true
    bypass_review = true
    notify = ["all"]
  }
}

rule ExistentialThreat {
  when {
    any_of(great_filters) == DETECTED
  }
  then {
    hypothesis = "Existential threat detected: ${threat_type()}"
    experiment = "Execute filter-specific response protocol"
    priority = CRITICAL
    auto_deploy = true
    bypass_review = true
    activate = "emergency_governance"
  }
}

// Functions available in rules
functions {
  baseline: "30-day rolling average"
  root_cause_analysis: "ML-based RCA using causal graphs"
  affected_cities: "Cities with metric deviation > 2σ"
  rolling_average(days): "Average over specified window"
  sentiment(source): "NLP sentiment analysis [-1, 1]"
  survey(name): "Latest survey results [0, 1]"
  variance(metric): "Statistical variance"
  days_until(event): "Predicted days to event"
  count(condition): "Count matching items"
  any_of(set): "Check if any element matches"
}

// Priority levels
priorities {
  LOW: "Review within 7 days"
  MEDIUM: "Review within 24 hours"
  HIGH: "Review within 6 hours"
  CRITICAL: "Immediate review required"
}

// Constraints (cannot be overridden)
constraints {
  max_rules_per_pulse: 10
  max_auto_deploys_per_pulse: 3
  min_review_time_critical: "10 minutes"
  cooldown_between_similar: "24 hours"
  require_proof_for_critical: true
}