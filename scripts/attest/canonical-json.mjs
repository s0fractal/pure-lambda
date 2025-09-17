#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Canonical JSON for DSSE attestation signing/verification
 *
 * Provides deterministic JSON serialization for cryptographic signing.
 * Must produce identical bytes for sign and verify operations.
 */

/**
 * Canonicalize any JSON-serializable object into deterministic bytes
 *
 * Rules:
 * - Sort keys alphabetically (lexicographic) at all levels
 * - Arrays maintain their order (no sorting)
 * - Numbers are normalized to their minimal string representation
 * - No whitespace in output
 * - Deterministic serialization for identical signature bytes
 *
 * @param {any} obj - Any JSON-serializable value
 * @returns {string} Canonical JSON string
 */
function canonicalize(obj) {
  function canonicalizeValue(item) {
    if (item === null || item === undefined) {
      return item;
    }

    if (Array.isArray(item)) {
      // Arrays keep their order, but recursively canonicalize items
      return item.map(canonicalizeValue);
    }

    if (typeof item === 'object') {
      // Sort keys lexicographically and recursively canonicalize values
      const sorted = {};
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
      // Normalize numbers to minimal string representation
      if (Number.isInteger(item)) {
        return item; // Keep integers as-is
      }

      // For floats, use toPrecision to avoid floating point artifacts
      const precision = item.toPrecision(15);
      return Number(precision);
    }

    // Strings, booleans, etc. - return as-is
    return item;
  }

  const canonical = canonicalizeValue(obj);
  return JSON.stringify(canonical);
}

/**
 * Convert canonical JSON string to bytes for signing/verification
 *
 * @param {string} canonicalJson - Canonical JSON string
 * @returns {Uint8Array} Bytes ready for signing
 */
function toBytes(canonicalJson) {
  return new TextEncoder().encode(canonicalJson);
}

export {
  canonicalize,
  toBytes
};