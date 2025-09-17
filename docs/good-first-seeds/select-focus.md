# 🌱 Seed: select-focus (Branch-Aware Router)

## Overview
Create a compact seed that performs conditional routing with branch highlighting.

**Difficulty:** ⭐⭐
**Novelty Target:** 0.42
**Size Limit:** ≤10KB

## Technical Requirements

### Core Pattern
```
ENTER → SELECT(condition) → FOCUS(highlight) → EXIT
```

### Key Features
- Dynamic branch selection based on input condition
- Highlight active branch for visibility
- Default fallback for undefined branches

### Implementation Guide
```json
{
  "nodes": {
    "selector": {
      "op": "SELECT",
      "params": {
        "condition": "${branch}",
        "default": "main"
      }
    },
    "focus": {
      "op": "FOCUS",
      "params": {
        "target": "${selector.output}",
        "highlight": true
      }
    }
  }
}
```

### Test Fixtures Required
- Branch = "main" → Expected: main path
- Branch = "alt" → Expected: alt path
- Branch = null → Expected: default (main)
- Branch = "other" → Expected: default (main)

## Validation Checklist
- [ ] Trust score ≥95%
- [ ] DSSE envelope generated
- [ ] XIDv2 unique identifier
- [ ] Size ≤10KB
- [ ] 4 test fixtures pass

## How to Submit

1. Create your seed based on template:
   ```bash
   cp seeds/templates/select-focus.json my-select-focus.json
   ```

2. Validate locally:
   ```bash
   npm run ck:validate my-select-focus.json
   ```

3. Generate bundle:
   ```bash
   npm run ck:bundle my-select-focus.json
   ```

4. Submit PR titled: `Seed Proposal: select-focus (PL-SEED-01)`

## Tips
- Keep operator chains minimal
- Ensure XIDv2 includes timestamp for uniqueness
- Document your intent clearly

## Badge Eligibility
- 🏅 Pioneer (first 10)
- 🌟 Novelty >40%
- 💎 Compact (<5KB)