---
hypothesis: ${HYPOTHESIS_ID}
type: microH_causal
author: ${AUTHOR_DID}
created: ${TIMESTAMP}
status: proposed

# Causal Micro-Hypothesis Template

## 1. Claim (What changes)

**Current state**: ${CURRENT_BEHAVIOR}
**Proposed state**: ${PROPOSED_BEHAVIOR}
**Mechanism**: ${CAUSAL_MECHANISM}

## 2. Causal Structure (Why it works)

### Causal DAG
```
${CAUSE} → ${MEDIATOR} → ${EFFECT}
     ↓                      ↑
    [confounders?]    [moderators?]
```

### Do-operator intervention
```
do(${CAUSE} = ${NEW_VALUE})
```

### Expected causal effect
```
E[${EFFECT} | do(${CAUSE})] - E[${EFFECT}] = ${EFFECT_SIZE}
```

## 3. Counterfactual Test (Proof by negation)

**Counterfactual**: If we DON'T apply this change...
- **Then**: ${COUNTERFACTUAL_OUTCOME}
- **Evidence**: ${SUPPORTING_DATA}
- **Confidence**: ${CONFIDENCE_LEVEL}

## 4. Minimal Experiment

### Setup
```yaml
control_group:
  treatment: null
  expected: ${BASELINE_PERFORMANCE}

treatment_group:
  treatment: ${INTERVENTION}
  expected: ${IMPROVED_PERFORMANCE}

difference:
  metric: ${PRIMARY_METRIC}
  expected_delta: ${DELTA}
  significance: ${P_VALUE}
```

### Success criteria
- [ ] Causal effect > ${MIN_EFFECT_SIZE}
- [ ] Counterfactual holds in ${N}% of tests
- [ ] No negative side effects on ${INVARIANTS}
- [ ] Effect persists for > ${DURATION} pulses

## 5. Implementation

### Code changes
```diff
- ${OLD_CODE}
+ ${NEW_CODE}
```

### Affected genes
- ${GENE_1}: ${MODIFICATION_1}
- ${GENE_2}: ${MODIFICATION_2}

### Max scope
- Lines changed: < ${MAX_LINES}
- Genes affected: < ${MAX_GENES}
- Backwards compatible: ${COMPATIBLE}

## 6. Rollback plan

### Trigger conditions
- Effect size < ${MIN_EFFECT}
- Error rate > ${MAX_ERROR_RATE}
- Invariant violation

### Rollback procedure
1. Revert to snapshot ${SNAPSHOT_ID}
2. Apply compensating transaction
3. Verify restoration

## 7. Validation

### Pre-flight checks
- [ ] Causal DAG is acyclic
- [ ] Counterfactual is testable
- [ ] Experiment has control group
- [ ] Effect size is measurable

### During execution
- [ ] Monitor ${PRIMARY_METRIC}
- [ ] Track ${SECONDARY_METRICS}
- [ ] Watch for ${CONFOUNDERS}

### Post-execution
- [ ] Causal effect measured
- [ ] Counterfactual verified
- [ ] Receipt generated with causal proof

---

## Example: FOCUS Optimization

```yaml
hypothesis: focus_reduces_allocation
type: microH_causal

claim:
  current: "filter then map (2 passes, 2 allocations)"
  proposed: "FOCUS (1 pass, 1 allocation)"
  mechanism: "FOCUS → fewer_passes → less_allocation → faster"

causal:
  dag: "FOCUS → passes → allocations → performance"
  intervention: "do(use_FOCUS = true)"
  effect: "E[allocations | do(FOCUS)] = 0.5 * E[allocations]"

counterfactual:
  if_not: "If we keep filter+map"
  then: "2x allocations, 1.8x slower"
  confidence: 0.92

experiment:
  control:
    code: "filter(xs, p).map(f)"
    expected_allocations: 1000
  treatment:
    code: "FOCUS(xs, p, f, g)"
    expected_allocations: 500
  metric: "allocations_per_operation"
  expected_improvement: 50%

validation:
  - "Causal effect: -50% allocations ✓"
  - "Counterfactual: verified in 10/10 tests ✓"
  - "No side effects on correctness ✓"
```

---

## Philosophy

Every change has a cause and an effect.
By making causality explicit, we:
- Understand WHY changes work
- Predict effects before deployment
- Learn from counterfactuals
- Build more robust systems

The best hypothesis is one that includes its own refutation.

---

*Template version: 1.0.0*
*Based on Pearl's Causal Inference framework*