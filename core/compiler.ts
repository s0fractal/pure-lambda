/**
 * Compiler/Bridge between λ-world and JS-world
 * Converting Church encodings to native JavaScript values
 */

import { ChurchNum } from './lambda-pure';

/**
 * Convert Church numeral to JavaScript number
 */
export const compileNumber = (churchNum: ChurchNum): number => {
  return churchNum((n: number) => n + 1)(0);
};

/**
 * Convert Church boolean to JavaScript boolean
 */
export const compileBoolean = <T>(churchBool: (a: T) => (b: T) => T): boolean => {
  return churchBool(true)(false);
};

/**
 * Convert Church list to JavaScript array
 */
export const compileList = <T>(churchList: any): T[] => {
  const result: T[] = [];
  
  let current = churchList;
  while (!isNil(current)) {
    result.push(head(current));
    current = tail(current);
  }
  
  return result;
};

// Helper functions for list operations
const isNil = (list: any): boolean => {
  try {
    return list((_: any) => (_: any) => false)(true);
  } catch {
    return true;
  }
};

const head = <T>(list: any): T => {
  return list((h: T) => (_: any) => h)(undefined);
};

const tail = (list: any): any => {
  return list((_: any) => (t: any) => t)(null);
};

/**
 * Convert Church pair to JavaScript tuple
 */
export const compilePair = <A, B>(churchPair: any): [A, B] => {
  const first = churchPair((a: A) => (_: B) => a);
  const second = churchPair((_: A) => (b: B) => b);
  return [first, second];
};

/**
 * Optimize Church numeral operations
 * Instead of applying successor n times, use direct arithmetic
 */
export class ChurchOptimizer {
  private cache: Map<any, number> = new Map();
  
  /**
   * Memoized compilation
   */
  compile(churchNum: ChurchNum): number {
    if (this.cache.has(churchNum)) {
      return this.cache.get(churchNum)!;
    }
    
    const result = compileNumber(churchNum);
    this.cache.set(churchNum, result);
    return result;
  }
  
  /**
   * Optimize addition - don't build Church numerals, compute directly
   */
  optimizedAdd(m: ChurchNum, n: ChurchNum): number {
    return this.compile(m) + this.compile(n);
  }
  
  /**
   * Optimize multiplication
   */
  optimizedMult(m: ChurchNum, n: ChurchNum): number {
    return this.compile(m) * this.compile(n);
  }
  
  /**
   * Optimize factorial with memoization
   */
  private factCache: Map<number, number> = new Map();
  
  optimizedFactorial(n: number): number {
    if (n <= 1) return 1;
    
    if (this.factCache.has(n)) {
      return this.factCache.get(n)!;
    }
    
    const result = n * this.optimizedFactorial(n - 1);
    this.factCache.set(n, result);
    return result;
  }
  
  /**
   * Clear caches to free memory
   */
  clearCache(): void {
    this.cache.clear();
    this.factCache.clear();
  }
}

/**
 * Bridge for complex λ-expressions
 */
export class LambdaBridge {
  private optimizer = new ChurchOptimizer();
  
  /**
   * Evaluate λ-expression and return JS value
   */
  evaluate(expr: any): any {
    // Try to identify type and compile accordingly
    if (typeof expr === 'function') {
      // Try as Church numeral
      try {
        const num = compileNumber(expr as ChurchNum);
        if (!isNaN(num)) return num;
      } catch {}
      
      // Try as Church boolean
      try {
        const bool = compileBoolean(expr);
        return bool;
      } catch {}
      
      // Return as-is if can't compile
      return expr;
    }
    
    return expr;
  }
  
  /**
   * Profile λ-expression performance
   */
  profile(name: string, expr: () => any): void {
    const start = performance.now();
    const result = this.evaluate(expr());
    const end = performance.now();
    
    console.log(`⚡ ${name}:`);
    console.log(`   Result: ${result}`);
    console.log(`   Time: ${(end - start).toFixed(3)}ms`);
  }
  
  /**
   * Compare Church vs optimized implementation
   */
  benchmark(name: string, churchImpl: () => any, jsImpl: () => any): void {
    console.log(`📊 Benchmark: ${name}`);
    
    const churchStart = performance.now();
    const churchResult = this.evaluate(churchImpl());
    const churchEnd = performance.now();
    
    const jsStart = performance.now();
    const jsResult = jsImpl();
    const jsEnd = performance.now();
    
    const churchTime = churchEnd - churchStart;
    const jsTime = jsEnd - jsStart;
    const speedup = churchTime / jsTime;
    
    console.log(`   Church: ${churchResult} (${churchTime.toFixed(3)}ms)`);
    console.log(`   JS: ${jsResult} (${jsTime.toFixed(3)}ms)`);
    console.log(`   Speedup: ${speedup.toFixed(2)}x ${speedup > 1 ? '🚀' : '🐌'}`);
  }
}

/**
 * Visual representation of Church numerals
 */
export function visualizeChurchNum(n: ChurchNum): string {
  const value = compileNumber(n);
  const dots = '•'.repeat(Math.min(value, 20));
  const extra = value > 20 ? `... +${value - 20}` : '';
  return `${dots}${extra} (${value})`;
}

/**
 * Create Church numeral from JS number (optimized)
 */
export function fromNumber(n: number): ChurchNum {
  if (n === 0) {
    return <T>(s: (x: T) => T) => (z: T) => z;
  }
  
  // Build efficiently using doubling
  const buildChurch = (k: number): ChurchNum => {
    if (k === 0) return <T>(s: (x: T) => T) => (z: T) => z;
    if (k === 1) return <T>(s: (x: T) => T) => (z: T) => s(z);
    
    const half = buildChurch(Math.floor(k / 2));
    const double = <T>(s: (x: T) => T) => (z: T) => 
      half(s)(half(s)(z));
    
    if (k % 2 === 0) {
      return double;
    } else {
      return <T>(s: (x: T) => T) => (z: T) => s(double(s)(z));
    }
  };
  
  return buildChurch(n);
}

/**
 * Example usage
 */
export function demonstrateCompiler() {
  console.log('🔧 Compiler/Bridge Demonstration');
  console.log('='.repeat(40));
  
  const optimizer = new ChurchOptimizer();
  const bridge = new LambdaBridge();
  
  // Import Church numerals (would come from lambda-pure)
  const THREE = <T>(s: (x: T) => T) => (z: T) => s(s(s(z)));
  const FIVE = <T>(s: (x: T) => T) => (z: T) => s(s(s(s(s(z)))));
  
  console.log('Church THREE:', visualizeChurchNum(THREE));
  console.log('Church FIVE:', visualizeChurchNum(FIVE));
  
  console.log('\n📊 Optimization comparison:');
  bridge.benchmark(
    'Addition 3+5',
    () => fromNumber(3 + 5),
    () => 3 + 5
  );
  
  console.log('\n⚡ Factorial optimization:');
  console.log('5! =', optimizer.optimizedFactorial(5));
  console.log('10! =', optimizer.optimizedFactorial(10));
  
  console.log('\n✅ Compiler bridge operational!');
}