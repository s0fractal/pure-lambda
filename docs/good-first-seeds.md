# Good First Seeds - 100 Seeds Week

## 🌱 Starter Seeds (Novelty 0.4-0.5)

### 1. select-focus (branch-aware)
**Difficulty:** ⭐⭐
**Novelty:** 0.42
**Intent:** Conditional routing with branch highlighting

```json
{
  "op_chain": "ENTER → SELECT → FOCUS → EXIT",
  "key_feature": "Dynamic branch selection with highlight"
}
```

**Requirements:**
- 4 test fixtures (true/false × 2 datasets)
- Size ≤10KB
- DSSE envelope required

---

### 2. bounded-delay (energy-saving)
**Difficulty:** ⭐⭐
**Novelty:** 0.45
**Intent:** Skip spikes, guaranteed max delay

```json
{
  "op_chain": "ENTER → FOCUS → BOUNDED_DELAY → EXIT",
  "key_feature": "Energy-efficient debouncing"
}
```

**Requirements:**
- DOE with 3 intervals
- Prove L doesn't degrade
- Size ≤10KB

---

### 3. route-audit (auto-receipts)
**Difficulty:** ⭐⭐⭐
**Novelty:** 0.48
**Intent:** Auto-generate micro-receipts on merge

```json
{
  "op_chain": "SPLIT → PROCESS → MERGE(+receipt) → EXIT",
  "key_feature": "Automatic audit trail"
}
```

**Requirements:**
- DSSE for local subjectHash
- Receipt validation
- Size ≤10KB

---

### 4. partition-rr (fair scheduling)
**Difficulty:** ⭐⭐⭐
**Novelty:** 0.51
**Intent:** Fair round-robin across branches

```json
{
  "op_chain": "SPLIT → SCAN(rr) → MERGE → EXIT",
  "key_feature": "Equal distribution guarantee"
}
```

**Requirements:**
- Test with 1k events
- Prove uniform distribution
- Size ≤10KB

---

### 5. scan-metrics (threshold aggregator)
**Difficulty:** ⭐⭐
**Novelty:** 0.47
**Intent:** Counter/aggregator with thresholds and colors

```json
{
  "op_chain": "ENTER → SCAN → FOCUS(threshold) → EXIT",
  "key_feature": "Color-coded metrics"
}
```

**Requirements:**
- 3 threshold levels
- Color mapping
- Stable XIDv2

---

## 🚀 Advanced Seeds (Novelty >0.5)

### 6. split-then-select (adaptive fork)
**Difficulty:** ⭐⭐⭐⭐
**Novelty:** 0.62
**Intent:** Adaptive fork based on cost profile

```json
{
  "op_chain": "PROFILE → SPLIT → SELECT → MERGE",
  "key_feature": "Cost-aware branching"
}
```

---

### 7. delay-scan-antihysteresis
**Difficulty:** ⭐⭐⭐⭐
**Novelty:** 0.58
**Intent:** Stabilize noisy signals

```json
{
  "op_chain": "DELAY → SCAN → STABILIZE → EXIT",
  "key_feature": "Anti-hysteresis band"
}
```

---

### 8. merge-proof (confluence)
**Difficulty:** ⭐⭐⭐⭐⭐
**Novelty:** 0.71
**Intent:** Emit Church-Rosser proof

```json
{
  "op_chain": "BRANCH × 2 → MERGE(verify) → EMIT(proof)",
  "key_feature": "Mathematical confluence proof"
}
```

---

## How to Start

1. **Pick a seed** from the list above
2. **Copy template** from `/seeds/templates/[seed-name].json`
3. **Customize** parameters and add your twist
4. **Validate locally:**
   ```bash
   npm run ck:validate path/to/your-seed.json
   ```
5. **Bundle with DSSE:**
   ```bash
   npm run ck:bundle path/to/your-seed.json
   ```
6. **Submit PR** with title: `Seed Proposal: [name] (PL-SEED-01)`

## Tips for High Trust Score

- **Minimize size:** Remove unnecessary fields
- **Ensure uniqueness:** Use timestamp in XIDv2
- **Add fixtures:** Include test cases
- **Document intent:** Clear, concise purpose
- **No BIOLOCK tokens:** Avoid dual-use terms

## Badges You Can Earn

- 🏅 **Pioneer** - First 10 contributors
- 🌟 **Innovator** - Novelty >40%
- 🎯 **Excellence** - Trust 100%
- 🚀 **Speed Runner** - Submit within 24h
- 💎 **Compact** - Seed <5KB

## Support

- Ask questions in [Discussions](https://github.com/s0fractal/pure-lambda/discussions)
- Check [Scoreboard](https://pure-lambda.org/docs/scoreboard/) for progress
- Use [Field Kiosk](https://pure-lambda.org/docs/otm/kiosk.html) to test

---

*Happy seeding! 🌱*