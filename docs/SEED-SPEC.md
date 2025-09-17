# PL-SEED-01 Specification

Мінімальні вимоги до "computational seed".

## Формат
- JSON (UTF-8), ≤ 80KB
- Поля:
  - `name` (≤64 символи)
  - `pattern` (один з Pair-Lexicon)
  - `params` (object)
  - `version` = `"1"`
  - `attestation` (optional DSSE)

Див. `schemas/pl-seed-01.schema.json`. Приклади good/bad — у `seeds/templates/`.

## Політики
- XIDv2 обов'язковий при інжесті (генерується пайплайном)
- BIOLOCK v2: заборонені токени відсічуються до PR