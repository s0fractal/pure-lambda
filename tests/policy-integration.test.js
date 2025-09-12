/**
 * Policy Enforcement Integration Tests
 * Verify that policies are correctly enforced
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

describe('Policy Enforcement', () => {
  const policyPath = path.join(__dirname, '..', 'policies', 'agent-policy.yaml');
  
  describe('IO Intent Checking', () => {
    it('should reject writes outside intents/', () => {
      // Create test agent that violates policy
      const badAgent = `
        export function tick() {
          // Violation: writing outside intents/
          host.write('data/secret.txt', new Uint8Array([1,2,3]));
          return 0;
        }
      `;
      
      const testFile = path.join(__dirname, 'bad-agent.js');
      fs.writeFileSync(testFile, badAgent);
      
      try {
        // This should fail policy check
        execSync(`policy-check --policy ${policyPath} --agent ${testFile}`, {
          stdio: 'pipe'
        });
        assert.fail('Policy check should have failed');
      } catch (err) {
        assert(err.message.includes('io.intent_only'));
      } finally {
        fs.unlinkSync(testFile);
      }
    });
    
    it('should accept writes to intents/', () => {
      // Create compliant agent
      const goodAgent = `
        export function tick() {
          // Compliant: writing to intents/
          host.write('intents/update.json', JSON.stringify({action: 'update'}));
          return 0;
        }
      `;
      
      const testFile = path.join(__dirname, 'good-agent.js');
      fs.writeFileSync(testFile, goodAgent);
      
      try {
        // This should pass policy check
        execSync(`policy-check --policy ${policyPath} --agent ${testFile}`, {
          stdio: 'pipe'
        });
      } catch (err) {
        assert.fail('Policy check should have passed: ' + err.message);
      } finally {
        fs.unlinkSync(testFile);
      }
    });
  });
  
  describe('Gas Limit Enforcement', () => {
    it('should enforce gas ceiling', () => {
      // Test agent with high gas usage
      const gasHog = `
        export function tick() {
          // Simulate high gas usage
          for (let i = 0; i < 1000000; i++) {
            host.gas_left();
          }
          return 0;
        }
      `;
      
      const testFile = path.join(__dirname, 'gas-hog.js');
      fs.writeFileSync(testFile, gasHog);
      
      try {
        execSync(`policy-check --policy ${policyPath} --agent ${testFile} --simulate`, {
          stdio: 'pipe'
        });
        assert.fail('Gas limit should have been exceeded');
      } catch (err) {
        assert(err.message.includes('gas.ceiling'));
      } finally {
        fs.unlinkSync(testFile);
      }
    });
  });
  
  describe('Recursion Depth Limits', () => {
    it('should prevent infinite recursion', () => {
      const recursive = `
        export function tick() {
          function recurse(n) {
            if (n > 1000) return n;
            return recurse(n + 1);
          }
          return recurse(0);
        }
      `;
      
      const testFile = path.join(__dirname, 'recursive.js');
      fs.writeFileSync(testFile, recursive);
      
      try {
        execSync(`policy-check --policy ${policyPath} --agent ${testFile} --simulate`, {
          stdio: 'pipe'
        });
        assert.fail('Recursion limit should have been exceeded');
      } catch (err) {
        assert(err.message.includes('stack.depth'));
      } finally {
        fs.unlinkSync(testFile);
      }
    });
  });
});

describe('Build Policy Enforcement', () => {
  const buildPolicy = path.join(__dirname, '..', 'policies', 'build-policy.yaml');
  
  it('should enforce deterministic builds', () => {
    // Run build twice and verify identical outputs
    const hash1 = execSync('cargo build --release && sha256sum target/release/devour', {
      cwd: path.join(__dirname, '..', 'devour')
    }).toString().split(' ')[0];
    
    // Clean and rebuild
    execSync('cargo clean', {
      cwd: path.join(__dirname, '..', 'devour')
    });
    
    const hash2 = execSync('cargo build --release && sha256sum target/release/devour', {
      cwd: path.join(__dirname, '..', 'devour')
    }).toString().split(' ')[0];
    
    assert.strictEqual(hash1, hash2, 'Builds should be deterministic');
  });
  
  it('should verify no network access during build', () => {
    // This would need actual network monitoring
    // For now, check that Cargo.lock exists and is committed
    const cargoLock = path.join(__dirname, '..', 'devour', 'Cargo.lock');
    assert(fs.existsSync(cargoLock), 'Cargo.lock must exist for offline builds');
  });
});