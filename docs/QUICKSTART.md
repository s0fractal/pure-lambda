<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2025 Pure Lambda Authors -->

# Pure Lambda Quickstart

Get Pure Lambda running locally in 3 commands. No network required.

## Prerequisites

- Node.js 18+ with TypeScript support
- Standard UNIX tools (make, unzip)

## Quick Start

### 1. Build release package
```bash
make release-local
```

### 2. Open embassy interface
```bash
open embassy/index.html
```

### 3. Load and verify
```bash
# In the embassy interface:
# - Click "Load JSON" → select dist/operon.json
# - Click "Load Envelope" → select receipts/attest/envelope.json
# - Review security badges (should show all green)
# - Check "Best Route" panel for optimization recommendations
```

## What you get

- **Security verification**: Cryptographic attestation of all artifacts
- **Performance insights**: L-value optimization and route analysis
- **Safety validation**: BIOLOCK gate status and preflight results
- **Offline operation**: Complete functionality without network access

## Troubleshooting

**CAR format blocked?** System auto-falls back to JSON mode.
**Missing envelope.json?** Run `npm run attest:make` to generate.
**Build fails?** Check preflight with `npm run biolock:rename`.

## Next steps

- Review badges for performance tuning opportunities
- Explore contract templates in `embassy/welcome-pack/`
- Run full test suite with `npm test`

---

*Complete deployment in under 2 minutes*