# Soul vs Intent: Тотожність і Воля

## Одним реченням

**Soul** фіксує *що воно є* (канонічний зміст → hash)  
**Intent** задає *як воно змінюється* (градієнт еволюції при незмінній суті)

## Формально

Для стану організму `state` (λ-IR, protein-вектор, середовище):

```
Intent(state) → {w, R_allow, Laws, Focus, ε, Caps}
```

Де:
- **w** - ваги вартості: `C = α·cycles + β·bytes + γ·allocs + δ·io_risk`
- **R_allow** - дозволені правила е-графа
- **Laws** - інваріанти що мають триматись
- **Focus** - ROI/sparsity (яку частку даних обробляти)
- **ε** - критерій early_stop ("досить добре")
- **Caps** - проникність мембрани (які ефекти дозволені)

## Фрактальність

Intent працює на всіх рівнях:

| Рівень | Intent |
|--------|--------|
| **Ген** | "бути швидшим на списках, без алокацій" |
| **Організм** | "мінімізуй p95, тримай пам'ять < X" |
| **Екосистема** | "резонувати з SEEK/LIVE, уникати EXOTIC" |

## Дві моди

### EXPLORER (SEEK/TRANSFORM)
```yaml
weights: { cycles: 0.5, bytes: 0.1, allocs: 0.3, io: 1.0 }
focus: { sparsity: 0.98 }  # Process only 2%
epsilon: 1e-2               # Stop early
rules: [experimental, aggressive]
```

### GUARDIAN (GUARD/RESONATE)
```yaml
weights: { cycles: 1.0, bytes: 1.0, allocs: 1.0, io: ∞ }
focus: { sparsity: 0.0 }   # Process everything
epsilon: 1e-6              # Near perfection
rules: [proven_only]
laws: [strict_all]
```

## Реалізація в Pure Lambda

```rust
// Soul - semantic identity
pub fn compute_soul(ir: &IR) -> String {
    let canonical = normalize(ir);
    blake3::hash(&canonical)
}

// Intent - evolution gradient
pub struct Intent {
    pub weights: CostWeights,
    pub allowed_rules: Vec<Rule>,
    pub laws: Vec<Law>,
    pub focus: Focus,
    pub epsilon: f64,
    pub caps: Capabilities,
}

impl Intent {
    pub fn apply(&self, state: &State) -> Evolution {
        // Intent drives evolution while preserving soul
        let soul_before = compute_soul(&state.ir);
        let evolved = self.evolve(state);
        assert_eq!(soul_before, compute_soul(&evolved.ir));
        evolved
    }
}
```

## Ключова різниця

| | Soul | Intent |
|---|---|---|
| **Що** | Тотожність ("це саме цей сенс") | Воля ("як цей сенс поводиться") |
| **Змінюється** | Ні (інваріант) | Так (еволюціонує) |
| **Вимірюється** | Hash (дискретно) | Градієнт (неперервно) |
| **Час** | Вічний | Контекстуальний |

## Композиція

Intents складаються як векторні поля:

```
Intent_total = Σ w_i · Intent_i
```

Локальні наміри генів додаються в спільний градієнт організму.

---

*"Душа тримає форму, а інтент веде траєкторію"*