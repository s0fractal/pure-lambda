---
contract: v0
type: pilot
name: "Open Science Data Focus"
issuer: did:pl:Human-ResearchLead
assignee: did:pl:Agent-DataFocus
intent:
  goal: "Clean and focus large open scientific dataset for reproducible research"
  inputs:
    - view: "https://zenodo.org/record/example-dataset.csv"
      size: "2.3GB"
      consent: "public_domain"
    - view: "pilots/science/cleaning-rules.yaml"
      consent: "read"
  outputs:
    - intent: "pilots/science/cleaned-dataset.parquet"
      format: "parquet"
      compression: "snappy"
    - intent: "pilots/science/focus-report.md"
      format: "markdown"
    - intent: "pilots/science/reproducibility.json"
      format: "json"
policies:
  - io.intent_only
  - memory.streaming_only  # Don't load full dataset
  - computation.deterministic
  - audit.full_provenance
payment:
  kind: "credits"
  amount: 500
  source: "sustainability_fund"
  milestone_based: true
milestones:
  - {name: "data_loaded", pct: 20}
  - {name: "cleaning_complete", pct: 40}
  - {name: "focus_applied", pct: 30}
  - {name: "report_generated", pct: 10}
sla:
  max_duration_hours: 4
  max_memory_gb: 8
  attestation: "deterministic-build"
public_good:
  license: "CC0"
  availability: "permanent"
  citation: "Pure Lambda Open Science Initiative"
---

# Pilot 1: Open Science Data Processing

## Objective

Demonstrate that the Pure Lambda network can process large scientific datasets with:
- Full reproducibility
- Transparent provenance
- Public verification
- Zero trust requirement

## Dataset

Using publicly available climate data from Zenodo (or similar), we will:

1. **Clean**: Remove nulls, fix inconsistencies, standardize formats
2. **Focus**: Apply dimension reduction while preserving key signals
3. **Document**: Generate complete provenance chain
4. **Verify**: Allow anyone to reproduce results

## Success Criteria

- [ ] Dataset processed without errors
- [ ] Output independently verified by 3 auditors
- [ ] Provenance chain complete (every transformation logged)
- [ ] Results reproducible on different nodes
- [ ] Performance within SLA bounds

## Validation

The processed dataset will be:
- Checksummed at each stage
- Signed by executing agent
- Attested by validator nodes
- Made publicly available

## Impact

This pilot demonstrates Pure Lambda's capability for:
- Scientific computing at scale
- Trustless collaboration
- Reproducible research
- Public verification

## Public Monitoring

Track progress at: `/observability/pilots/open-science`

---

*"Science demands reproducibility. We deliver it cryptographically."*