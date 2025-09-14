---
contract: v0
type: pilot
name: "Civic Data Archive"
issuer: did:pl:Human-CityOfficial
assignee: did:pl:Agent-Archivist
intent:
  goal: "Transform city open data into verifiable, queryable archive"
  inputs:
    - view: "https://data.city.gov/budgets/2024.csv"
      consent: "public_record"
    - view: "https://data.city.gov/contracts/2024.json"
      consent: "public_record"
    - view: "pilots/civic/schema.yaml"
  outputs:
    - intent: "pilots/civic/archive.sqlite"
      format: "sqlite"
      indexed: true
    - intent: "pilots/civic/visualizations/*.html"
      format: "html"
      interactive: true
    - intent: "pilots/civic/verification.json"
      format: "json"
policies:
  - io.public_only
  - privacy.no_personal_data
  - transparency.full_audit
  - reproducibility.guaranteed
payment:
  kind: "credits"
  amount: 750
  source: "sustainability_fund"
sla:
  max_duration_hours: 2
  attestation: "enclave"
public_benefit:
  access: "unrestricted"
  api: "pilots/civic/query"
  license: "public_domain"
---

# Pilot 2: Civic Data Archive

## Objective

Transform messy government open data into:
- Structured, queryable format
- Verifiable transformation chain
- Interactive visualizations
- Permanent public archive

## Data Sources

Working with city open data portals:
- Budget allocations
- Contract awards
- Service metrics
- Public feedback

## Processing Pipeline

1. **Ingestion**: Fetch from public APIs
2. **Normalization**: Standardize formats/schemas
3. **Validation**: Check consistency/completeness
4. **Enrichment**: Add computed fields
5. **Visualization**: Generate interactive charts
6. **Archival**: Store with full provenance

## Deliverables

### For Citizens
- Simple web interface to explore data
- Downloadable verified datasets
- Shareable visualizations

### For Officials
- Data quality report
- Suggested improvements
- API for integration

### For Researchers
- Complete provenance chain
- Reproducible transformations
- Citation-ready metadata

## Verification

Each transformation step includes:
- Input hash
- Transformation code CID
- Output hash
- Attestation signature
- Timestamp

## Public Good

This archive will be:
- Permanently available
- Freely accessible
- Continuously updated
- Community maintained

## Success Metrics

- Data completeness: >95%
- Query response: <100ms
- Verification: 100% traceable
- Adoption: >100 users in first month

---

*"Public data deserves public verification."*