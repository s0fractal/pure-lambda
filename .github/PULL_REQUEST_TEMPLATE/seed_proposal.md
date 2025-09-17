---
name: Seed Proposal
about: Submit a computational seed for 100 Seeds Week
title: 'Seed Proposal: [NAME] (PL-SEED-01)'
labels: contrib:seed
---

## Seed Submission Checklist

### Required Files
- [ ] `.json` seed definition
- [ ] `.cartridge` file (from `npm run ck:bundle`)
- [ ] `envelope.json` with DSSE signature

### Validation Checks
- [ ] Trust score ≥95% (`npm run ck:validate path/to/seed.json`)
- [ ] Size ≤80KB (seed), ≤100KB (total with envelope)
- [ ] Conformance ≥90%
- [ ] BIOLOCK compliant (no dual-use tokens)
- [ ] XIDv2 unique identifier present

### Seed Details
**Name:** <!-- your-seed-name -->
**Intent:** <!-- Brief description of what this seed does -->
**Novelty:** <!-- What makes this seed unique? -->
**Size:** <!-- XX KB -->

### Test Results
```bash
# Paste output from:
npm run ck:validate path/to/seed.json
```

### Links
- [ ] MirrorBench results: <!-- generated after submission -->
- [ ] Badges will be auto-generated

### Additional Notes
<!-- Any special considerations or dependencies -->

---
*By submitting this PR, I confirm that:*
- This seed is my original work or properly attributed
- I've tested it locally and it passes all checks
- I consent to the seed being included in the Pure Lambda ecosystem under MIT license