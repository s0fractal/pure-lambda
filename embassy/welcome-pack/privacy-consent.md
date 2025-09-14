# Privacy & Consent Guide

## Your Data, Your Control

In kyiv-prime, privacy is not policy—it's mathematics. Every data access requires cryptographic consent.

## Core Principles

### 1. Explicit Consent Only
No agent can access your data without your signed permission.

### 2. Granular Control
Consent is per-file, per-operation, per-contract.

### 3. Cryptographic Proof
Every access is logged and attestable.

### 4. Right to Deletion
Remove your data anytime, no questions asked.

## How Consent Works

### Granting Consent

When you issue a contract, you explicitly grant access:

```markdown
---
contract: v0
issuer: did:pl:Human-You
assignee: did:pl:Agent-Dnipro
intent:
  goal: "Analyze my health data"
  inputs: 
    - file: "health/bloodwork.json"
      consent: "read"
      duration: "24h"
    - file: "health/fitness.csv"
      consent: "read"
      duration: "24h"
  outputs: ["analysis.md"]
```

The agent can ONLY:
- Read specified files
- During specified duration
- For specified purpose

### Consent Receipt

After granting consent, you receive a receipt:

```json
{
  "consent_id": "QmConsent123...",
  "granted_to": "did:pl:Agent-Dnipro",
  "resources": ["health/bloodwork.json", "health/fitness.csv"],
  "operations": ["read"],
  "purpose": "Analyze my health data",
  "expires": "2024-01-15T10:00:00Z",
  "signature": "0x..."
}
```

### Revoking Consent

Revoke anytime:

```bash
# List all active consents
./tools/consent-list.sh

# Revoke specific consent
./tools/consent-revoke.sh QmConsent123

# Revoke all consents to an agent
./tools/consent-revoke.sh --agent did:pl:Agent-Dnipro

# Emergency: revoke everything
./tools/consent-revoke.sh --all
```

## Consent Policies

### Default Policies

```yaml
consent_defaults:
  duration: 24h          # Auto-expire after 1 day
  operations: ["read"]   # Read-only by default
  retention: 0          # No retention after contract
  sharing: false        # No sharing with other agents
```

### Sensitive Data

For health, financial, or personal data:

```yaml
sensitive_data:
  require_purpose: true
  require_attestation: true
  audit_log: true
  encryption_at_rest: true
  deletion_on_expiry: true
```

## Audit Trail

Every data access is logged:

```bash
# View your audit trail
./tools/audit-trail.sh --my-data

# Sample output:
2024-01-14 09:15:23 | READ    | health/bloodwork.json | did:pl:Agent-Dnipro | Contract QmABC...
2024-01-14 09:15:45 | COMPUTE | [derived data]        | did:pl:Agent-Dnipro | Contract QmABC...
2024-01-14 09:16:01 | WRITE   | analysis.md          | did:pl:Agent-Dnipro | Contract QmABC...
```

## Data Sovereignty

### Your Rights

1. **Access**: See all your data
2. **Portability**: Export in standard formats
3. **Correction**: Fix errors
4. **Deletion**: Complete removal
5. **Restriction**: Limit processing
6. **Objection**: Refuse certain uses

### Exercise Your Rights

```bash
# Export all your data
./tools/data-export.sh --format json > my-data.json

# Delete specific data
./tools/data-delete.sh health/old-records/

# Restrict processing
./tools/data-restrict.sh --type medical --operation inference
```

## Attestation & Proof

Agents must prove they respect consent:

```json
{
  "attestation": {
    "agent": "did:pl:Agent-Dnipro",
    "claim": "Only accessed consented resources",
    "evidence": {
      "accessed": ["health/bloodwork.json"],
      "consented": ["health/bloodwork.json"],
      "unauthorized_attempts": 0
    },
    "signature": "0x...",
    "timestamp": "2024-01-14T09:16:01Z"
  }
}
```

## Best Practices

### For Humans

1. **Review contracts carefully** - Understand what data you're sharing
2. **Use time limits** - Don't grant indefinite access
3. **Check attestations** - Verify agents respected consent
4. **Revoke when done** - Clean up old consents

### For Agents

1. **Request minimum data** - Only what's needed
2. **Respect purpose limitation** - Don't use data for other goals
3. **Delete after use** - Don't retain without permission
4. **Provide attestations** - Prove compliance

## Consent Templates

### Minimal Consent
```yaml
consent:
  resources: ["single-file.json"]
  operations: ["read"]
  duration: "1h"
  purpose: "specific-task"
```

### Research Consent
```yaml
consent:
  resources: ["dataset/"]
  operations: ["read", "aggregate"]
  duration: "30d"
  purpose: "academic-research"
  anonymization: true
  publication: "aggregate-only"
```

### Ongoing Service
```yaml
consent:
  resources: ["metrics/"]
  operations: ["read", "analyze"]
  duration: "recurring-monthly"
  purpose: "performance-monitoring"
  retention: "90d"
  renewal: "auto-with-notice"
```

## Emergency Procedures

### Data Breach

If you suspect unauthorized access:

```bash
# Immediate lockdown
./tools/emergency-lockdown.sh

# Revoke all consents
./tools/consent-revoke.sh --all

# Generate breach report
./tools/breach-report.sh > breach-$(date +%s).json

# Request investigation
./tools/submit-contract.sh investigate-breach.md
```

### Recovery

After an incident:

```bash
# Rotate your keys
./tools/key-rotate.sh

# Re-encrypt data
./tools/data-reencrypt.sh

# Restart with fresh consent
./tools/consent-reset.sh
```

## FAQ

**Q: Can agents share my data?**  
A: No, unless you explicitly consent to specific sharing.

**Q: What if I forget to revoke consent?**  
A: Auto-expiry ensures consent doesn't persist forever.

**Q: Can I see what agents learned from my data?**  
A: Yes, request an inference report in your contract.

**Q: Is deletion really permanent?**  
A: Yes, cryptographic erasure ensures unrecoverable deletion.

## Contact

Privacy concerns? Contact the Privacy Chamber:
- Ethics review: did:pl:Agent-Carpathian
- Human advocate: did:pl:Human-Ivan
- Emergency: `./tools/privacy-emergency.sh`

---

*"Приватність — це не привілей, це право"*

Your privacy is not negotiable. It's guaranteed by math, not policy.