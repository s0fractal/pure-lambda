#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Canonical Bytes - Single Source of Truth
 *
 * ЄДИНЕ джерело істини для перетворення об'єктів у канонічні байти.
 * JSON.stringify з рекурсивним сортуванням ключів, нормалізацією чисел,
 * без BOM, без \n у кінці.
 *
 * Це ЄДИНИЙ спосіб формування байтів для підписування та верифікації.
 */

/**
 * Перетворює об'єкт у канонічні байти для підписування/верифікації
 *
 * Правила канонізації:
 * - Рекурсивне сортування ключів лексикографічно
 * - Масиви зберігають порядок (без сортування)
 * - Числа нормалізуються до мінімального представлення
 * - Без пробілів, без BOM, без \n у кінці
 * - Детермінований результат для ідентичних байтів підпису
 *
 * @param {any} obj - Будь-який JSON-серіалізабельний об'єкт
 * @returns {Uint8Array} Канонічні байти готові для підписування
 */
export function canonicalBytes(obj) {
  function canonicalizeValue(item) {
    if (item === null || item === undefined) {
      return item;
    }

    if (Array.isArray(item)) {
      // Масиви зберігають порядок, але рекурсивно канонізуємо елементи
      return item.map(canonicalizeValue);
    }

    if (typeof item === 'object') {
      // Сортуємо ключі лексикографічно та рекурсивно канонізуємо значення
      const sorted = {};
      const sortedKeys = Object.keys(item).sort();

      for (const key of sortedKeys) {
        const value = canonicalizeValue(item[key]);
        // Включаємо тільки не-undefined значення
        if (value !== undefined) {
          sorted[key] = value;
        }
      }

      return sorted;
    }

    if (typeof item === 'number') {
      // Нормалізація чисел до мінімального представлення
      if (Number.isInteger(item)) {
        return item; // Цілі числа залишаємо як є
      }

      // Для float'ів використовуємо toPrecision для уникнення артефактів
      const precision = item.toPrecision(15);
      return Number(precision);
    }

    // Рядки, булеани, тощо - повертаємо як є
    return item;
  }

  const canonical = canonicalizeValue(obj);
  const canonicalJson = JSON.stringify(canonical);

  // Перетворюємо в байти без BOM, без \n
  return new TextEncoder().encode(canonicalJson);
}

/**
 * Допоміжна функція для отримання canonical JSON string (для дебагу)
 */
export function canonicalJson(obj) {
  const bytes = canonicalBytes(obj);
  return new TextDecoder().decode(bytes);
}

/**
 * Тестова функція для перевірки детермінованості
 */
export function testDeterminism(obj, iterations = 10) {
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const bytes = canonicalBytes(obj);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    results.push(hex);
  }

  const unique = new Set(results);
  return {
    deterministic: unique.size === 1,
    iterations,
    uniqueResults: unique.size,
    firstResult: results[0]
  };
}

// CLI для тестування
if (import.meta.url === `file://${process.argv[1]}`) {
  const testObj = {
    beta: [3, 1, 2],
    alpha: { z: 'last', a: 'first' },
    gamma: 42.0,
    delta: null
  };

  console.log('Test object:', JSON.stringify(testObj, null, 2));
  console.log('\nCanonical JSON:', canonicalJson(testObj));

  const bytes = canonicalBytes(testObj);
  console.log('\nCanonical bytes length:', bytes.length);
  console.log('First 32 bytes (hex):',
    Array.from(bytes.slice(0, 32))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''));

  console.log('\nDeterminism test:', testDeterminism(testObj));
}