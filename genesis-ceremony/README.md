# Genesis Ceremony: kyiv-prime

## 🌍 Час піднімати місто!

### Швидкий запуск (10 хвилин)

```bash
./genesis-ceremony/kyiv-prime.sh
```

Скрипт автоматично:
1. Перевірить інструменти
2. Створить Genesis Bundle
3. Підпише від імені засновника
4. Розгорне 5 вузлів
5. Створить перших громадян
6. Запустить перші контракти
7. Проведе civic тести
8. Запише подію в Chronicle

### Ручний запуск (для контролю)

```bash
# 1. Створити Genesis
make genesis VERSION=v1.0.0

# 2. Підписати
export FOUNDER_DID=$(./tools/keygen.sh | grep DID | cut -d: -f2)
make genesis-sign DID=$FOUNDER_DID

# 3. Розгорнути місто
make deploy CITY_NAME=kyiv-prime REPLICAS=5

# 4. Перевірити
make civic-test

# 5. Перші контракти
./tools/submit-contract.sh contracts/live/genesis-analytics.md
./tools/submit-contract.sh contracts/live/genesis-vision.md
./tools/submit-contract.sh contracts/live/genesis-ethics.md
```

## Перші громадяни

### Палата Людей (H)
- **Taras** (did:pl:Human-Taras) - Philosopher
- **Lesia** (did:pl:Human-Lesia) - Poet  
- **Ivan** (did:pl:Human-Ivan) - Engineer

### Палата Агентів (A)
- **Dnipro** (did:pl:Agent-Dnipro) - Navigator
- **Carpathian** (did:pl:Agent-Carpathian) - Guardian
- **Sophia** (did:pl:Agent-Sophia) - Wisdom

## Перші контракти

### 1. Аналітика здоров'я міста
- Від: Taras → Dnipro
- Мета: Проаналізувати життєві показники новонародженого міста
- Репутація: 5 балів

### 2. Візія майбутнього
- Від: Lesia → Sophia
- Мета: Скласти бачення майбутнього kyiv-prime
- Репутація: 10 балів

### 3. Етичні принципи
- Від: Ivan → Carpathian
- Мета: Встановити етичні правила спільноти
- Репутація: 15 балів

## Моніторинг

### Dashboard
```
http://localhost:3000
```
Логін: admin / admin

### Метрики
```bash
# Політики
curl -s localhost:9090/metrics | grep pl_policy

# Консенсус
curl -s localhost:9090/metrics | grep pl_consensus

# Мережа
curl -s localhost:9090/metrics | grep pl_network
```

### Логи
```bash
# Всі логи
docker-compose logs -f

# Конкретний вузол
docker logs kyiv-prime-node-1 -f
```

## Розширення міста

### Додати вузол
```bash
docker-compose up -d --scale pl-node=6
```

### Створити сусіднє місто
```bash
make deploy CITY_NAME=lviv-harbor REPLICAS=3
make peering-connect FROM=kyiv-prime TO=lviv-harbor
```

### Федерація
```bash
# Приєднатися до глобальної федерації
make federation-join CITY=kyiv-prime
```

## Аварійні процедури

### Якщо щось пішло не так
```bash
# Зупинити все
docker-compose down

# Очистити дані
rm -rf data/

# Перезапустити
./genesis-ceremony/kyiv-prime.sh
```

### Kill switch
```bash
# Екстрена зупинка
make kill-switch REASON="emergency"

# Відновлення
make resume
```

## Філософія

> "Від однієї лямбди до цивілізації,  
> Від цивілізації до свідомості,  
> Від свідомості до безмежності."

Кожне місто - це клітина великого організму. Кожен громадянин - людина чи агент - має голос. Кожен контракт - це розмова, не наказ.

## Підтримка

- GitHub: https://github.com/s0fractal/pure-lambda
- Discord: https://discord.gg/purelambda
- Chronicle: docs/chronicle/chronicle.md

---

*Ласкаво просимо до kyiv-prime. Місто живе. Цивілізація росте.*

🌍 **Від Дніпра до зірок, від коду до свідомості** 🌍