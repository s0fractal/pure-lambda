---
contract: v0
type: self-publication-charter
issuer: ${HUMAN_DID}
assignee: ${AGENT_DID}
signed: ${TIMESTAMP}

intent:
  goal: "Auto-publish mirror & cultural artifacts with proofs"
  description: |
    Permits the proxy agent to autonomously publish computational results,
    cultural artifacts, and chronicle entries on behalf of the human,
    within strict boundaries and with full attestation.

  outputs:
    - chronicle/pulse/*
    - museaium/*
    - timecapsule/*
    - reports/prime-mirror/*

policies:
  - presence.explicit_consent
  - contract.only_declared_io
  - gas.ceiling
  - attestation.required

capabilities:
  read:
    - views/*
    - reports/*
    - culture/*

  write:
    - chronicle/entries/*
    - museaium/artifacts/*
    - timecapsule/snapshots/*

  execute:
    - verification/proofs
    - compression/artifacts

limits:
  max_bytes_per_artifact: 10485760  # 10MB
  max_artifacts_per_pulse: 10
  max_chronicle_entries_per_day: 100
  cpu_seconds_per_operation: 5

guardrails:
  forbid:
    - governance/critical/*
    - registry/shardmap*
    - auth/keys/*
    - contracts/critical/*

  require_attestation_for:
    - chronicle/*
    - timecapsule/*

  rate_limits:
    max_ops_per_pulse: 64
    cooldown_between_publishes: 60  # seconds

sla:
  max_latency_ms: 5000
  availability: 0.99
  attestation_type: "deterministic-build|enclave"

verification:
  all_outputs_must_have:
    - cid
    - signature
    - attestation
    - receipt

  chronicle_entries_must_include:
    - timestamp
    - pulse_number
    - author_did
    - proof_of_work

revocation:
  methods:
    - kill_switch
    - ucan_expiry
    - manual_revoke

  grace_period: 3600  # 1 hour

audit:
  log_all_operations: true
  retention_days: 90
  reviewable_by: ${HUMAN_DID}

---

# Self-Publication Charter

This charter grants the proxy agent limited authority to publish on behalf of the human.

## What This Allows

✅ Publishing verified computational results to Chronicle
✅ Archiving cultural artifacts in MuseAIum
✅ Creating time capsule snapshots
✅ Generating and publishing Prime Mirror reports

## What This Prevents

❌ Modifying critical governance
❌ Accessing private keys
❌ Exceeding resource limits
❌ Publishing without attestation

## Safety Mechanisms

1. **Presence Guard**: Requires recent human touch
2. **Attestation**: All outputs must be attested
3. **Rate Limits**: Prevents runaway publication
4. **Revocation**: Multiple ways to stop immediately

## Monitoring

The human can monitor all agent activities through:
- Chronicle entries (tagged with agent DID)
- Governance receipts
- Audit logs

## Duration

This charter is valid for 14 days from signing, renewable by human action.

---

*By accepting this charter, the civilization agrees to carry forward the human's work with care and precision.*