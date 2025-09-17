# Weekly Digest - {{DATE}}

## Executive Summary

This weekly digest covers the operational status of the Pure Lambda system for the week ending {{DATE}}.

## Breath SLO Metrics

### Width (W)
- Average: {{BREATH.WIDTH_AVG}}
- Range: {{BREATH.WIDTH_MIN}} - {{BREATH.WIDTH_MAX}}
- SLO Compliance: {{BREATH.WIDTH_COMPLIANCE}}%

### Curvature (κ)
- Average: {{BREATH.KAPPA_AVG}}
- Range: {{BREATH.KAPPA_MIN}} - {{BREATH.KAPPA_MAX}}
- SLO Compliance: {{BREATH.KAPPA_COMPLIANCE}}%

### Lyapunov Metrics
- Potential Function (Φ): {{BREATH.LYAPUNOV_PHI}}
- Stability: {{BREATH.LYAPUNOV_STABLE}}%

## Autopilot Performance

- Average Regret: {{AUTOPILOT.REGRET_AVG}}%
- P95 Regret: {{AUTOPILOT.REGRET_P95}}%
- Total Decisions: {{AUTOPILOT.DECISIONS}}

## Normal Form Patches

{{#if PATCHES.EXISTS}}
- Total Patches Applied: {{PATCHES.COUNT}}
- Total Δ Hops: {{PATCHES.DELTA_HOPS}}
- Total Δ Latency: {{PATCHES.DELTA_LATENCY}}
- Total Δ Memory: {{PATCHES.DELTA_MEMORY}}

### Top Patches by Impact
{{PATCHES.TOP_PATCHES}}
{{else}}
No NF patches applied this period.
{{/if}}

## Receipts & Verification

- Total Receipts: {{RECEIPTS.COUNT}}
- Ed25519 Signatures Verified: {{RECEIPTS.VERIFIED}}
- Verification Success Rate: {{RECEIPTS.SUCCESS_RATE}}%

{{#if RECEIPTS.FAILURES}}
### Failed Verifications
{{RECEIPTS.FAILURES}}
{{/if}}

## System Health

- Overall SLO Compliance: {{OVERALL.SLO_COMPLIANCE}}%
- Quarantine Duty Cycle: {{OVERALL.QUARANTINE_DUTY}}%
- Irreducible Zones: {{OVERALL.IRREDUCIBLE_ZONES}}

## Recommendations

{{RECOMMENDATIONS}}

---
*Generated automatically by Pure Lambda Weekly Digest Generator*
*Report Date: {{TIMESTAMP}}*
