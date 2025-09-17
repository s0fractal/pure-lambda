# LLM Habitat (Sandbox)

Мета: безпечне, детерміноване середовище для локальних експериментів з LLM (мережа/FS заблоковані).

## API (локальний офлайн)
`POST /invoke`
```json
{ "model":"stub", "prompt":"...", "seed":42, "limits":{"tokens":512,"timeMs":2000} }
```
Відповідь: `{ "text":"...", "tokens":N, "receipt":{...} }`

## Гарантії
- Determinism: seeded RNG, стабільний clock
- No FS/NET: будь-які спроби → BLOCK (BIOLOCK hooks)
- DSSE-ready квитанція (subject-hash, params)

> За замовчуванням **OFF**. Вмикається лише через governance (див. policies/governance.toml).