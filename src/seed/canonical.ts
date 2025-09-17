// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Canonical JSON functions for deterministic serialization and hashing
 */

/**
 * Canonicalize any JSON-serializable object into a deterministic string
 *
 * Rules:
 * - Sort keys alphabetically (lexicographic) at all levels
 * - Arrays maintain their order (no sorting)
 * - Numbers are normalized using toPrecision(10) then parsed back as Number
 * - No whitespace in output
 * - Deterministic serialization
 *
 * @param x - Any JSON-serializable value
 * @returns Canonical JSON string
 */
export function canonicalize(x: any): string {
  function canonicalizeValue(item: any): any {
    if (item === null || item === undefined) {
      return item;
    }

    if (Array.isArray(item)) {
      // Arrays keep their order, but recursively canonicalize items
      return item.map(canonicalizeValue);
    }

    if (typeof item === 'object') {
      // Sort keys lexicographically and recursively canonicalize values
      const sorted: any = {};
      const sortedKeys = Object.keys(item).sort();

      for (const key of sortedKeys) {
        const value = canonicalizeValue(item[key]);
        // Only include non-undefined values
        if (value !== undefined) {
          sorted[key] = value;
        }
      }

      return sorted;
    }

    if (typeof item === 'number') {
      // Normalize numbers: toPrecision(10) then parse back
      if (Number.isInteger(item)) {
        return item; // Keep integers as-is
      }

      const precision = item.toPrecision(10);
      return Number(precision);
    }

    // Strings, booleans, etc. - return as-is
    return item;
  }

  const canonical = canonicalizeValue(x);
  return JSON.stringify(canonical);
}