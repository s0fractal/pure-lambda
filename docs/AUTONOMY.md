# Autonomy Levels (LoA) for Pure Lambda

Ціль: зробити "автономію" вимірюваною. Ми фіксуємо 4 рівні (0..3) для софтверної системи.

| LoA | Опис                           | Орієнтирні пороги (SLO)                                  |
|-----|--------------------------------|-----------------------------------------------------------|
| 0   | Manual-only                    | ручний запуск/мерджі                                     |
| 1   | Automated pipelines            | ga gate зелений, без самокорекції                        |
| 2   | Reactive gatekeeping (поточне) | trust≥95%, dsse=100%, breath.slo≥90%, TTQ≤120s           |
| 3   | Proactive policy tuning        | LoA2 + decision receipts, burn-rate≤2×, regret≤3%        |

**Мапінг метрик → LoA:**
- **trust, dsse, novelty, regret** з dashboards
- **breath.slo, burn-rate, κ** з дихання
- **TTQ** (time-to-quarantine) з red-lane

> Target: перейти з **LoA2 → LoA3** (див. ROADMAP.md).