#!/usr/bin/env node

/**
 * Test runner for TypeScript tests
 * Compiles and runs TypeScript test files
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Find all test files
const testFiles = [
  'core/lambda-pure.test.ts'
];

console.log('🧪 Running Pure Lambda Tests\n');

let allPassed = true;

for (const testFile of testFiles) {
  if (!fs.existsSync(testFile)) {
    console.log(`⚠️  Test file not found: ${testFile}`);
    continue;
  }
  
  console.log(`Running ${testFile}...`);
  
  try {
    // Compile TypeScript to JavaScript
    const jsFile = testFile.replace('.ts', '.js');
    execSync(`npx tsc ${testFile} --target es2020 --module commonjs --esModuleInterop`, {
      stdio: 'pipe'
    });
    
    // Run the compiled JavaScript
    const result = execSync(`node ${jsFile}`, {
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    
    console.log(result);
    
    // Clean up compiled file
    if (fs.existsSync(jsFile)) {
      fs.unlinkSync(jsFile);
    }
    
    // Also clean up any compiled dependencies
    const compiledCore = 'core/lambda-pure.js';
    if (fs.existsSync(compiledCore)) {
      fs.unlinkSync(compiledCore);
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${testFile}`);
    console.error(error.message);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\n✅ All tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed');
  process.exit(1);
}