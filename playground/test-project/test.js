#!/usr/bin/env node

// Simple test file to demonstrate PCTA

const startTime = Date.now()
let passed = 0
let failed = 0

// Pure function that can be memoized
/* @pure */
function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

// Another pure function
/* @pure */
function isPrime(n) {
  if (n <= 1) return false
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false
  }
  return true
}

// Test runner
function test(name, fn) {
  try {
    fn()
    console.log(`✓ ${name}`)
    passed++
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`)
    failed++
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}

// Run tests
console.log('Running tests...\n')

// Fibonacci tests (expensive without memoization)
test('fibonacci(10) = 55', () => {
  assert(fibonacci(10) === 55)
})

test('fibonacci(15) = 610', () => {
  assert(fibonacci(15) === 610)
})

test('fibonacci(20) = 6765', () => {
  assert(fibonacci(20) === 6765)
})

// Repeated calls that benefit from memoization
for (let i = 0; i < 10; i++) {
  test(`fibonacci repeat test ${i}`, () => {
    assert(fibonacci(15) === 610)
    assert(fibonacci(10) === 55)
    assert(fibonacci(20) === 6765)
  })
}

// Prime tests
test('isPrime(17) = true', () => {
  assert(isPrime(17) === true)
})

test('isPrime(100) = false', () => {
  assert(isPrime(100) === false)
})

// More repeated tests
for (let i = 0; i < 20; i++) {
  test(`prime repeat test ${i}`, () => {
    assert(isPrime(97) === true)
    assert(isPrime(1000) === false)
    assert(isPrime(7919) === true)
  })
}

// Results
const endTime = Date.now()
const duration = endTime - startTime

console.log('\n' + '='.repeat(40))
console.log(`Tests: ${passed} passed, ${failed} failed`)
console.log(`Time: ${duration}ms`)
console.log('='.repeat(40))

// Exit code
process.exit(failed > 0 ? 1 : 0)