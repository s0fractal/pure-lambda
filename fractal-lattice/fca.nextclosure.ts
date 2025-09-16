#!/usr/bin/env node
/**
 * Next-Closure algorithm for FCA
 * Input: context.jsonl
 * Output: concepts.jsonl
 */

import { readFileSync, writeFileSync } from 'fs'

interface ContextRow {
  object: string
  attributes: string[]
}

interface Concept {
  intent: string[]  // Closed set of attributes
  extent: string[]  // Objects having all intent attributes
}

function loadContext(file: string): { objects: string[], attributes: string[], incidence: Map<string, Set<string>> } {
  const lines = readFileSync(file, 'utf-8').trim().split('\n')
  const objects: string[] = []
  const allAttributes = new Set<string>()
  const incidence = new Map<string, Set<string>>()  // object -> attributes

  for (const line of lines) {
    const row: ContextRow = JSON.parse(line)
    objects.push(row.object)
    incidence.set(row.object, new Set(row.attributes))
    for (const attr of row.attributes) {
      allAttributes.add(attr)
    }
  }

  return {
    objects,
    attributes: Array.from(allAttributes).sort(),
    incidence
  }
}

function computeClosure(
  attrs: Set<string>,
  incidence: Map<string, Set<string>>,
  objects: string[]
): { intent: Set<string>, extent: Set<string> } {

  // Find objects having all attributes in attrs
  const extent = new Set<string>()
  for (const obj of objects) {
    const objAttrs = incidence.get(obj) || new Set()
    let hasAll = true
    for (const attr of attrs) {
      if (!objAttrs.has(attr)) {
        hasAll = false
        break
      }
    }
    if (hasAll) {
      extent.add(obj)
    }
  }

  // Find attributes common to all objects in extent
  const intent = new Set<string>()
  if (extent.size > 0) {
    // Start with first object's attributes
    const firstObj = Array.from(extent)[0]
    const firstAttrs = incidence.get(firstObj) || new Set()

    for (const attr of firstAttrs) {
      let commonToAll = true
      for (const obj of extent) {
        const objAttrs = incidence.get(obj) || new Set()
        if (!objAttrs.has(attr)) {
          commonToAll = false
          break
        }
      }
      if (commonToAll) {
        intent.add(attr)
      }
    }
  }

  return { intent, extent }
}

function isLexSmaller(a: string[], b: string[]): boolean {
  const minLen = Math.min(a.length, b.length)
  for (let i = 0; i < minLen; i++) {
    if (a[i] < b[i]) return true
    if (a[i] > b[i]) return false
  }
  return a.length < b.length
}

function nextLex(current: string[], universe: string[]): string[] | null {
  // Find next lexicographically larger subset
  const currentSet = new Set(current)

  // Try adding elements not in current
  for (const attr of universe) {
    if (!currentSet.has(attr)) {
      return [...current, attr].sort()
    }
  }

  // Try removing last element and finding next
  if (current.length > 0) {
    const last = current[current.length - 1]
    const lastIndex = universe.indexOf(last)
    if (lastIndex < universe.length - 1) {
      // Replace with next element
      return [...current.slice(0, -1), universe[lastIndex + 1]].sort()
    }
  }

  return null  // No next subset
}

function nextClosure(contextFile: string, outputFile: string) {
  const { objects, attributes, incidence } = loadContext(contextFile)
  const concepts: Concept[] = []
  const seen = new Set<string>()

  console.log(`Running Next-Closure on ${objects.length} objects, ${attributes.length} attributes...`)

  // Start with empty set
  let current: string[] = []
  const maxIterations = Math.min(1000, Math.pow(2, attributes.length))  // Limit for large contexts

  for (let iter = 0; iter < maxIterations; iter++) {
    const { intent, extent } = computeClosure(new Set(current), incidence, objects)
    const intentArray = Array.from(intent).sort()
    const intentKey = intentArray.join(',')

    if (!seen.has(intentKey)) {
      seen.add(intentKey)
      concepts.push({
        intent: intentArray,
        extent: Array.from(extent)
      })

      if (iter % 10 === 0) {
        console.log(`  Iteration ${iter}: found ${concepts.length} concepts`)
      }
    }

    // Get next subset
    const next = nextLex(current, attributes)
    if (!next) break
    current = next
  }

  // Always add the top concept (all attributes)
  const { intent: topIntent, extent: topExtent } = computeClosure(new Set(attributes), incidence, objects)
  const topKey = Array.from(topIntent).sort().join(',')
  if (!seen.has(topKey)) {
    concepts.push({
      intent: Array.from(topIntent).sort(),
      extent: Array.from(topExtent)
    })
  }

  // Write concepts
  const lines = concepts.map(c => JSON.stringify(c))
  writeFileSync(outputFile, lines.join('\n'))

  console.log(`\nFound ${concepts.length} concepts`)
  console.log(`Output: ${outputFile}`)

  return concepts
}

// Run if called directly
if (require.main === module) {
  nextClosure('fractal-lattice/context.jsonl', 'fractal-lattice/concepts.jsonl')
}

export { nextClosure }