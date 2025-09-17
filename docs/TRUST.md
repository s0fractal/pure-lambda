# Trust System

Pure Lambda використовує багаторівневу систему довіри для забезпечення безпеки та якості компонентів.

## Як рахується Trust Score

### Формула
```
trust_score = 0.4 × dsse_ratio + 0.4 × conformance_ratio + 0.2 × freshness

Де:
- dsse_ratio = кількість підписаних DSSE / загальна кількість seed'ів
- conformance_ratio = кількість відповідних стандартам / загальна кількість
- freshness = clamp(1 - median_age_days/365, 0, 1)
```

### Рівні довіри
| Score | Рівень | Опис |
|-------|--------|------|
| 0.9-1.0 | **Excellent** | 100% DSSE + conformance ≥0.9 + свіжість ≤7 днів |
| 0.7-0.89 | **Good** | Переважно підписано/відповідає стандартам |
| 0.5-0.69 | **Fair** | Змішані індикатори довіри |
| 0.3-0.49 | **Poor** | Обмежена верифікація |
| 0.0-0.29 | **Untrusted** | Не підписано/не відповідає стандартам |

## Як підняти Trust Score

### 1. DSSE Coverage (40% ваги)
```bash
# Підписати всі артефакти
make attest-all

# Перевірити підписи
make attest-verify
```

**Ціль:** 100% seed'ів мають валідні DSSE підписи

### 2. Conformance (40% ваги)
```bash
# Перевірити відповідність стандартам
make test-conformance

# Валідувати проти еталонних реалізацій
make test-interop
```

**Ціль:** conformance_ratio ≥ 0.9

### 3. Freshness (20% ваги)
```bash
# Оновити federation з garden seed'ами
make fed-garden

# Створити свіжі атестації
make garden-attest
```

**Ціль:** freshness ≤ 7 днів

## Ключові команди

### Основні
```bash
# Розрахунок поточного trust score
make trust

# Повна атестація всіх артефактів
make attest-all

# Оновлення federation свіжими seed'ами
make fed-garden
```

### Діагностика
```bash
# Детальна інформація про trust
node scripts/fed/trust.mjs

# Генерація badge'ів
node scripts/badges/trust-badge.mjs

# Перевірка DSSE підписів
npm run attest:verify
```

## Що означають бейджі

### Trust Badge
- 🟢 **Excellent** (0.9-1.0): Максимальна довіра
- 🟡 **Good** (0.7-0.89): Рекомендується для продакшн
- 🟠 **Fair** (0.5-0.69): Потребує покращення
- 🔴 **Poor/Untrusted** (<0.5): Не рекомендується

### Conformance Badge
- ✅ **Passing**: Відповідає всім стандартам IPLD/CAR/DSSE
- ⚠️ **Partial**: Часткова відповідність стандартам
- ❌ **Failing**: Не відповідає критичним стандартам

### DSSE Badge
- 🔐 **100%**: Всі компоненти криптографічно підписані
- 🔒 **80%+**: Більшість компонентів підписана
- 🔓 **<80%**: Недостатнє покриття підписами

### Freshness Badge
- 🟢 **Fresh** (≤7 днів): Компоненти оновлені нещодавно
- 🟡 **Recent** (≤30 днів): Прийнятна свіжість
- 🟠 **Stale** (≤365 днів): Застарілі компоненти
- 🔴 **Ancient** (>365 днів): Критично застарілі

## SLO для Production

- **Trust Score**: ≥ 0.8
- **DSSE Coverage**: ≥ 80%
- **Conformance**: ≥ 0.9
- **Freshness**: ≤ 30 днів
- **Quarantine Count**: 0

## Безпека

### BIOLOCK Protection
Всі компоненти проходять класифікацію безпеки:
- **TX Corridor**: Дозволений освітній/терапевтичний контент
- **DU Filtering**: Блокування dual-use біологічного контенту
- **Default Deny**: Автоматичне відхилення невідомих шаблонів

### Offline Verification
Повна верифікація довіри працює без мережі:
- BLAKE3 хеш-перевірка
- Ed25519 криптографічні підписи
- Структурна валідація schema
- Round-trip тестування

---
*Trust is earned through mathematical proof, not promises.*