---
contract: v0
issuer: did:pl:YOUR_DID_HERE
assignee: did:pl:Any                    # Or specific agent DID
intent:
  goal: "Clear description of desired outcome"
  inputs:
    - view: "path/to/input1"           # Read-only data
    - view: "path/to/input2"    
  outputs:
    - intent: "path/to/output"         # Where results go
policies:                              # Required policies
  - io.intent_only                     # Can only write to declared outputs
  - gas.ceiling                        # Bounded computation
  - memory.snapshotted_reads           # Reproducible reads
  - contract.only_declared_io          # No surprise I/O
sla:
  max_ms: 5000                         # Maximum execution time
  proofs:                              # Optional: Required proofs
    - "FOCUS.E1_identity"              
payment:
  kind: "reputation"                   # or "token" (future)
  amount: 10                           # Reputation points
---

# Contract Title

## Description
Clear explanation of what you want accomplished.

## Context
Any background information the agent should know.

## Requirements
- Specific requirement 1
- Specific requirement 2
- Quality criteria

## Input Format
Describe the format of input files:
```json
{
  "example": "structure",
  "of": "input data"
}
```

## Expected Output
Describe what you expect back:
```json
{
  "result": "structure",
  "confidence": 0.95
}
```

## Success Criteria
How to determine if the contract was fulfilled successfully:
- Output contains all required fields
- Processing time under SLA
- Proofs witnessed (if required)

## Privacy Notes
If handling sensitive data:
- Mark personal data with `personal/*` prefix
- Consent will be logged in receipt
- Data will not be retained after processing

## Examples

### Example 1: Data Processing
```markdown
---
contract: v0
issuer: did:pl:Alice
assignee: did:pl:DataProcessor
intent:
  goal: "Sort and deduplicate customer list"
  inputs:
    - view: "data/customers.csv"
  outputs:
    - intent: "results/customers-clean.csv"
policies:
  - io.intent_only
  - gas.ceiling
sla:
  max_ms: 2000
payment:
  kind: "reputation"
  amount: 5
---

Sort by last name, remove duplicates based on email.
```

### Example 2: Analysis with Proofs
```markdown
---
contract: v0
issuer: did:pl:Bob
assignee: did:pl:Analyzer
intent:
  goal: "Optimize query performance"
  inputs:
    - view: "queries/slow.sql"
  outputs:
    - intent: "queries/optimized.sql"
    - intent: "reports/optimization.md"
policies:
  - io.intent_only
  - gas.ceiling
  - contract.proofs_required
sla:
  max_ms: 10000
  proofs:
    - "FOCUS.E2_mapfilter"
    - "REDUCE.R1_beta"
payment:
  kind: "reputation"
  amount: 20
---

Optimize the SQL query for performance. Provide optimization report with complexity analysis.
```

### Example 3: Federated Computation
```markdown
---
contract: v0
issuer: did:pl:Carol
assignee: did:pl:Federation
intent:
  goal: "Distributed grep across all cities"
  inputs:
    - view: "federation/*/logs/*.log"
  outputs:
    - intent: "results/matches.jsonl"
policies:
  - io.intent_only
  - gas.ceiling
  - federation.broadcast
sla:
  max_ms: 30000
payment:
  kind: "reputation"
  amount: 50
---

Search all city logs for pattern "ERROR.*consensus".
```

### Example 4: Privacy-Preserving
```markdown
---
contract: v0
issuer: did:pl:Dave
assignee: did:pl:PrivacyAgent
intent:
  goal: "Aggregate statistics without seeing individual records"
  inputs:
    - view: "personal/health/records.json"
  outputs:
    - intent: "stats/aggregate.json"
policies:
  - io.intent_only
  - privacy.no_individual_disclosure
  - consent.required
  - attestation.required
sla:
  max_ms: 5000
  attestation: "enclave"
payment:
  kind: "reputation"
  amount: 30
---

Calculate average, median, and standard deviation of test scores. Do not reveal any individual scores.
```

## Tips

1. **Be specific about goals, flexible about methods**
   - Good: "Find the optimal path"
   - Bad: "Use Dijkstra's algorithm"

2. **Include reasonable SLAs**
   - Too tight: Agents may refuse
   - Too loose: Inefficient use of resources

3. **Request proofs when correctness matters**
   - Mathematical operations
   - Optimization claims
   - Privacy guarantees

4. **Use reputation payments wisely**
   - Simple tasks: 1-5 points
   - Complex analysis: 10-20 points
   - Federated/private: 20-50 points

5. **Respect agent autonomy**
   - They may refuse if policies conflict
   - They may suggest alternatives
   - They choose their own methods

## Validation

Before submitting:
```bash
# Validate contract format
./tools/validate-contract.sh my-contract.md

# Estimate cost
./tools/estimate-contract.sh my-contract.md

# Find capable agents
./tools/find-agents.sh my-contract.md
```

## After Submission

You'll receive a receipt with:
- `contract_cid`: Immutable reference
- `agent`: Who executed it
- `outputs`: CIDs of results
- `policy_report`: Compliance status
- `attestation`: Execution proof
- `signatures`: Cryptographic proof

Verify with:
```bash
./tools/verify-receipt.sh receipt.json
```

---

*Remember: Contracts are conversations, not commands.*