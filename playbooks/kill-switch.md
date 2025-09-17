# Kill Switch Playbook

## When to Activate

Activate kill switch when:
- Error rate exceeds 1% for 5 minutes
- Critical invariant violations detected
- Consensus split between chambers
- Security breach suspected
- Cascade failure in progress

## Activation Procedure

### 1. Immediate Actions (< 1 minute)

```bash
# Stop accepting new contracts
./tools/freeze-contracts.sh

# Alert all nodes
./tools/broadcast-alert.sh "KILL SWITCH ACTIVATED"

# Snapshot current state
make capsule EMERGENCY=true
```

### 2. Assess Situation (< 5 minutes)

```bash
# Check policy violations
make audit

# Review recent receipts
./tools/recent-receipts.sh --last 100

# Check consensus status
./tools/consensus-check.sh

# Identify affected nodes
./tools/node-health.sh
```

### 3. Execute Kill Switch Contract

Create emergency contract:

```markdown
---
contract: v0
issuer: did:pl:EmergencyCommittee
assignee: did:pl:AllNodes
intent:
  goal: "Emergency freeze"
  action: "kill-switch"
  reason: "SPECIFY REASON HERE"
  duration_minutes: 30
policies:
  - emergency.kill_switch
  - consensus.emergency_override
signatures:
  - did:pl:Governor1
  - did:pl:Governor2
  - did:pl:Governor3
---

# Emergency Kill Switch Activation

Reason: [DESCRIBE ISSUE]
Duration: 30 minutes
Recovery plan: See section 4
```

Submit with emergency flag:
```bash
./tools/submit-contract.sh --emergency kill-switch.md
```

### 4. During Freeze (5-30 minutes)

```bash
# Monitor only - no changes
watch -n 5 'make metrics'

# Collect diagnostic data
./tools/collect-diagnostics.sh

# Prepare recovery plan
vim recovery-plan.md
```

### 5. Recovery Decision

Two options:

#### Option A: Resume Operations
```bash
# Create resume contract
./tools/create-resume.sh

# Get emergency votes
./tools/emergency-vote.sh RESUME

# If approved, resume
./tools/resume-operations.sh
```

#### Option B: Rollback
```bash
# Identify last known good state
GOOD_STATE=$(./tools/find-good-state.sh)

# Create rollback contract
./tools/create-rollback.sh $GOOD_STATE

# Get emergency votes
./tools/emergency-vote.sh ROLLBACK

# If approved, rollback
./tools/rollback-to.sh $GOOD_STATE
```

### 6. Post-Incident (< 1 hour)

```bash
# Verify system health
make civic-test

# Generate incident report
./tools/incident-report.sh > incident-$(date +%s).md

# Update Chronicle
./tools/update-chronicle.sh "Kill switch activated and resolved"

# Schedule post-mortem
./tools/schedule-rfc.sh "Post-mortem for incident"
```

## Authority

Kill switch requires:
- 2 of 3 emergency governors OR
- 75% of both chambers (emergency vote) OR
- Automatic trigger from policy engine

## Automatic Triggers

System automatically activates kill switch when:

```yaml
triggers:
  - metric: error_rate
    threshold: 0.01
    duration: 300s
    
  - metric: consensus_split
    threshold: true
    duration: 60s
    
  - metric: policy_violations_rate
    threshold: 10
    duration: 60s
    
  - metric: node_failures
    threshold: 0.4  # 40% nodes down
    duration: 30s
```

## Communication

### Internal
```bash
# Alert all nodes
./tools/broadcast-alert.sh "KILL SWITCH: $REASON"

# Update status page
./tools/update-status.sh "EMERGENCY MAINTENANCE"
```

### External
- Post to status.purelambda.org
- Discord: @everyone in #emergency
- Email: emergency@purelambda.org

## Recovery Verification

Before resuming:
- [ ] Root cause identified
- [ ] Fix deployed or mitigated
- [ ] All nodes healthy
- [ ] Policies passing
- [ ] Consensus restored
- [ ] Test contracts executing
- [ ] Attestations valid

## Rollback Procedure

If recovery fails:

```bash
# Load last time capsule
CAPSULE=$(ls -t timecapsule-*.car | head -1)
./tools/bootstrap_from_car.sh $CAPSULE

# Verify restoration
make civic-test

# Resume with clean state
./tools/resume-operations.sh --clean
```

## Lessons Learned

After each activation:
1. Update this playbook
2. Add new automatic triggers
3. Improve diagnostics
4. Test in chaos engineering

## Contact

Emergency committee:
- did:pl:Governor1 (UTC+0)
- did:pl:Governor2 (UTC+8)  
- did:pl:Governor3 (UTC-8)

24/7 monitoring:
- alerts@purelambda.org
- PagerDuty: pure-lambda

---

*Remember: Kill switch is a tool, not a solution. Fix the root cause.*