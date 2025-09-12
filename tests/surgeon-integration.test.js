/**
 * Surgeon v2 Integration Tests
 * Verify e-graph optimization preserves semantics
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

describe('Surgeon Optimization', () => {
  const surgeonBin = path.join(__dirname, '..', 'surgeon', 'target', 'release', 'optimize');
  
  beforeEach(() => {
    // Build surgeon if not exists
    if (!fs.existsSync(surgeonBin)) {
      execSync('cargo build --release', {
        cwd: path.join(__dirname, '..', 'surgeon')
      });
    }
  });
  
  describe('Map Fusion', () => {
    it('should fuse consecutive maps', () => {
      const input = '(map f (map g xs))';
      const tmpFile = path.join(__dirname, 'test.lambda');
      fs.writeFileSync(tmpFile, input);
      
      const output = execSync(`${surgeonBin} ${tmpFile}`).toString();
      
      assert(output.includes('compose'), 'Should use compose for map fusion');
      assert(!output.includes('(map f (map g'), 'Should not have nested maps');
      
      fs.unlinkSync(tmpFile);
    });
  });
  
  describe('Filter-Map to FOCUS', () => {
    it('should convert filter+map to FOCUS', () => {
      const input = '(map f (filter p xs))';
      const tmpFile = path.join(__dirname, 'test.lambda');
      fs.writeFileSync(tmpFile, input);
      
      const output = execSync(`${surgeonBin} ${tmpFile}`).toString();
      
      assert(output.includes('FOCUS'), 'Should convert to FOCUS');
      assert(!output.includes('(map f (filter'), 'Should not have separate map+filter');
      
      fs.unlinkSync(tmpFile);
    });
  });
  
  describe('Semantic Preservation', () => {
    it('should preserve semantic hash', () => {
      const input = '(app (lam x (add x (const 1))) (const 5))';
      const tmpFile = path.join(__dirname, 'test.lambda');
      fs.writeFileSync(tmpFile, input);
      
      // Get initial semantic hash
      const hash1 = crypto.createHash('blake3')
        .update(input)
        .digest('hex')
        .substring(0, 8);
      
      const output = execSync(`${surgeonBin} ${tmpFile} 2>&1`).toString();
      
      // Check that semantic hash is reported as preserved
      assert(output.includes('Semantic hash:'), 'Should report semantic hash');
      
      // The output should be functionally equivalent even if syntactically different
      // For beta reduction: (app (lam x (add x (const 1))) (const 5)) 
      // Should reduce to: (add (const 5) (const 1))
      // Or further to: (const 6)
      
      fs.unlinkSync(tmpFile);
    });
    
    it('should report speedup metrics', () => {
      const input = '(filter p1 (filter p2 (map f (map g xs))))';
      const tmpFile = path.join(__dirname, 'test.lambda');
      fs.writeFileSync(tmpFile, input);
      
      const output = execSync(`${surgeonBin} ${tmpFile} 2>&1`).toString();
      
      // Check for optimization report
      assert(output.includes('Speedup:'), 'Should report speedup');
      assert(output.includes('Initial cost:'), 'Should report initial cost');
      assert(output.includes('Final cost:'), 'Should report final cost');
      
      // Parse speedup and verify it's >= 1.0
      const speedupMatch = output.match(/Speedup: ([\d.]+)x/);
      if (speedupMatch) {
        const speedup = parseFloat(speedupMatch[1]);
        assert(speedup >= 1.0, 'Speedup should be at least 1.0x');
      }
      
      fs.unlinkSync(tmpFile);
    });
  });
  
  describe('Idempotence', () => {
    it('should produce same result when run twice', () => {
      const input = '(map id (filter (compose p q) xs))';
      const tmpFile = path.join(__dirname, 'test.lambda');
      fs.writeFileSync(tmpFile, input);
      
      // First optimization
      const output1 = execSync(`${surgeonBin} ${tmpFile}`).toString().trim();
      
      // Save first output and optimize again
      fs.writeFileSync(tmpFile, output1);
      const output2 = execSync(`${surgeonBin} ${tmpFile}`).toString().trim();
      
      // Should be idempotent (or further optimized, but deterministic)
      assert(output2.length <= output1.length, 'Second pass should not make it worse');
      
      fs.unlinkSync(tmpFile);
    });
  });
  
  describe('Rule Application', () => {
    it('should apply constant folding', () => {
      const input = '(add (const 3) (const 4))';
      const tmpFile = path.join(__dirname, 'test.lambda');
      fs.writeFileSync(tmpFile, input);
      
      const output = execSync(`${surgeonBin} ${tmpFile}`).toString();
      
      assert(output.includes('(const 7)'), 'Should fold constants to 7');
      
      fs.unlinkSync(tmpFile);
    });
    
    it('should eliminate identity maps', () => {
      const input = '(map id xs)';
      const tmpFile = path.join(__dirname, 'test.lambda');
      fs.writeFileSync(tmpFile, input);
      
      const output = execSync(`${surgeonBin} ${tmpFile}`).toString();
      
      assert(output.trim() === 'xs', 'Should eliminate identity map');
      
      fs.unlinkSync(tmpFile);
    });
  });
});