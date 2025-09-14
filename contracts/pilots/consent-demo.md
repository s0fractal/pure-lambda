---
contract: v0
type: pilot
name: "Privacy-Preserving Health Analysis"
issuer: did:pl:Human-Patient
assignee: did:pl:Agent-HealthAnalyst
intent:
  goal: "Demonstrate granular consent and transparent data handling"
  inputs:
    - view: "pilots/consent/sample-health-data.json"
      consent:
        granted_fields: ["age", "symptoms", "medications"]
        denied_fields: ["name", "ssn", "address"]
        purpose: "research_only"
        duration: "24h"
        revocable: true
  outputs:
    - intent: "pilots/consent/analysis.md"
      format: "markdown"
      anonymized: true
    - intent: "pilots/consent/consent-trail.json"
      format: "json"
      public: true
policies:
  - privacy.field_level_consent
  - privacy.purpose_limitation
  - privacy.data_minimization
  - audit.consent_trail
  - security.encryption_at_rest
payment:
  kind: "credits"
  amount: 100
  source: "pilot_fund"
sla:
  max_duration_min: 30
  attestation: "enclave"
  delete_after: true
privacy:
  differential_privacy: true
  k_anonymity: 5
  audit_without_viewing: true
---

# Pilot 3: Consent-Driven Personal Data Processing

## Objective

Demonstrate Pure Lambda's capability for:
- Granular consent management
- Privacy-preserving computation
- Transparent audit trails
- User-controlled data

## Scenario

A person wants health data analyzed while:
- Keeping identity private
- Controlling field access
- Limiting purpose/duration
- Maintaining revocation right

## Consent Mechanism

### Granted Access
```json
{
  "fields": ["age", "symptoms", "medications"],
  "operations": ["read", "analyze"],
  "purpose": "research_only",
  "expires": "2024-01-15T10:00:00Z"
}
```

### Denied Access
```json
{
  "fields": ["name", "ssn", "address"],
  "operations": ["any"],
  "permanent": true
}
```

## Processing Guarantees

1. **Data Minimization**: Only consented fields accessed
2. **Purpose Limitation**: Only for declared research
3. **Time Limitation**: Auto-deletion after 24h
4. **Audit Trail**: Every access logged
5. **Revocability**: Instant consent withdrawal

## Verification Features

### For Data Subject
- See exactly what was accessed
- Verify purpose compliance
- Confirm deletion
- Revoke anytime

### For Auditors
- Verify consent was checked
- Confirm field restrictions
- Validate purpose limitation
- Check deletion occurred

### For Public
- See anonymized statistics
- Verify privacy preservation
- Review consent model
- Understand safeguards

## Privacy Technologies

- **Differential Privacy**: Add calibrated noise
- **K-Anonymity**: Ensure 5+ similar records
- **Secure Enclaves**: Process in isolation
- **Homomorphic Operations**: Compute on encrypted data

## Success Criteria

- [ ] Zero unauthorized field access
- [ ] Complete consent trail
- [ ] Successful revocation test
- [ ] Differential privacy verified
- [ ] Data deleted after expiry

## Impact

This pilot proves Pure Lambda can:
- Handle sensitive personal data
- Respect granular consent
- Provide transparency
- Enable GDPR compliance
- Build user trust

## Live Demo

Interactive demo at: `/demos/consent`

Users can:
1. Upload sample data
2. Set consent parameters
3. Watch processing
4. Verify compliance
5. Revoke and confirm deletion

---

*"Your data, your rules, cryptographically enforced."*