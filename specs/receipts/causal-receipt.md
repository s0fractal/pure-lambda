# Causal Receipt Specification v1
*Proof through causality, not just correlation*

## Core Insight

Traditional receipts show "what happened" (x=y).
Causal receipts prove "x caused y" through counterfactual reasoning.

## Receipt Extension

```yaml
receipt:
  # Standard fields
  id: CID
  execution: {...}

  # Causal extension
  causal:
    do:
      intervention: "set(X, value)"  # Pearl's do-operator
      target: "Y"
      mechanism: "X → Z → Y"

    counterfactual:
      premise: "if X had been x'"
      conclusion: "then Y would be y'"
      confidence: 0.85

    dag:
      nodes: ["X", "Z", "Y", "U"]
      edges:
        - {from: "X", to: "Z", type: "causal"}
        - {from: "Z", to: "Y", type: "causal"}
        - {from: "U", to: "Y", type: "confound"}

    evidence:
      natural: "Y when X=x"
      intervened: "Y when do(X=x')"
      difference: "effect_size"
```

## Causal Proof Criteria

A receipt is causally valid if:

1. **Intervention is well-defined**: do(X=x) is executable
2. **Counterfactual holds**: Given do(X=x'), Y changes predictably
3. **DAG is acyclic**: No causal loops
4. **Effect persists**: Removing confounders doesn't eliminate effect

## Example: Code Optimization

```yaml
causal:
  do:
    intervention: "apply(FOCUS_optimization)"
    target: "execution_time"
    mechanism: "FOCUS → fewer_passes → less_time"

  counterfactual:
    premise: "if we hadn't applied FOCUS"
    conclusion: "execution would take 2x longer"
    confidence: 0.92

  dag:
    nodes: ["FOCUS", "passes", "allocations", "time"]
    edges:
      - {from: "FOCUS", to: "passes", type: "causal"}
      - {from: "passes", to: "time", type: "causal"}
      - {from: "allocations", to: "time", type: "causal"}
```

## Validation Process

```python
def validate_causal_receipt(receipt):
    # 1. Check intervention feasibility
    assert can_intervene(receipt.causal.do.intervention)

    # 2. Run counterfactual experiment
    natural = observe(receipt.causal.do.target)
    intervened = do(receipt.causal.do.intervention)

    # 3. Verify effect
    effect = intervened - natural
    assert effect.matches(receipt.causal.counterfactual)

    # 4. Check DAG consistency
    assert is_acyclic(receipt.causal.dag)
    assert paths_exist(receipt.causal.dag, X, Y)

    return "CAUSAL_PROOF_VALID"
```

## Integration Points

### With Autopoiesis
Every micro-hypothesis must include:
- Causal claim (X causes Y)
- Counterfactual test
- Expected effect size

### With Prime Mirror
Track causality metrics:
- `causal_density`: % of receipts with causal proofs
- `counterfactual_accuracy`: how often counterfactuals hold
- `effect_stability`: variance in causal effects

### With Contracts
Contracts can specify required causal relationships:
```yaml
contract:
  invariants:
    - "optimization.causes(performance_gain)"
    - "noise.causes(generalization)"
```

## Why This Matters

1. **Deeper proof**: Not just "A and B happened" but "A caused B"
2. **Predictive power**: Counterfactuals let us predict interventions
3. **Debugging**: Causal DAG shows exactly where to intervene
4. **Trust**: Users can see WHY something worked, not just that it did

## Implementation Phases

### Phase 1: Basic (Now)
- Add causal field to receipts
- Simple do() operator
- Linear causal chains

### Phase 2: Advanced
- Confounders and mediators
- Backdoor adjustment
- Instrumental variables

### Phase 3: Full Pearl
- Structural causal models
- Causal discovery algorithms
- Automated counterfactual generation

---

*"Correlation does not imply causation, but causation leaves traces we can verify."*