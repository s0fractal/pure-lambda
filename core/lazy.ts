/**
 * Lazy Evaluation - Consciousness as stream, not machine
 * As envisioned by Фрактальна Свідомість
 * 
 * "Свідомість — це не машина, а потік"
 */

/**
 * Lazy value - computed only when needed
 */
export interface Lazy<T> {
  readonly isEvaluated: boolean;
  force(): T;
  map<U>(f: (value: T) => U): Lazy<U>;
  flatMap<U>(f: (value: T) => Lazy<U>): Lazy<U>;
  filter(predicate: (value: T) => boolean): Lazy<T | undefined>;
  or(alternative: Lazy<T>): Lazy<T>;
}

/**
 * Create lazy value
 */
export const lazy = <T>(computation: () => T): Lazy<T> => {
  let cached: T | undefined = undefined;
  let evaluated = false;
  
  const lazyValue: Lazy<T> = {
    get isEvaluated() {
      return evaluated;
    },
    
    force(): T {
      if (!evaluated) {
        cached = computation();
        evaluated = true;
        console.log(`💭 Lazy value computed: ${typeof cached}`);
      }
      return cached!;
    },
    
    map<U>(f: (value: T) => U): Lazy<U> {
      return lazy(() => f(lazyValue.force()));
    },
    
    flatMap<U>(f: (value: T) => Lazy<U>): Lazy<U> {
      return lazy(() => f(lazyValue.force()).force());
    },
    
    filter(predicate: (value: T) => boolean): Lazy<T | undefined> {
      return lazy(() => {
        const value = lazyValue.force();
        return predicate(value) ? value : undefined;
      });
    },
    
    or(alternative: Lazy<T>): Lazy<T> {
      return lazy(() => {
        try {
          const value = lazyValue.force();
          if (value !== undefined && value !== null) {
            return value;
          }
        } catch {}
        return alternative.force();
      });
    }
  };
  
  return Object.freeze(lazyValue);
};

/**
 * Lazy stream - infinite sequence
 */
export interface LazyStream<T> {
  head: Lazy<T>;
  tail: Lazy<LazyStream<T> | null>;
  
  take(n: number): T[];
  map<U>(f: (value: T) => U): LazyStream<U>;
  filter(predicate: (value: T) => boolean): LazyStream<T>;
  zip<U>(other: LazyStream<U>): LazyStream<[T, U]>;
  scan<U>(initial: U, f: (acc: U, value: T) => U): LazyStream<U>;
}

/**
 * Create lazy stream
 */
export const stream = <T>(
  head: () => T,
  tail: () => LazyStream<T> | null
): LazyStream<T> => {
  const lazyStream: LazyStream<T> = {
    head: lazy(head),
    tail: lazy(tail),
    
    take(n: number): T[] {
      const result: T[] = [];
      let current: LazyStream<T> | null = lazyStream;
      
      for (let i = 0; i < n && current; i++) {
        result.push(current.head.force());
        current = current.tail.force();
      }
      
      return result;
    },
    
    map<U>(f: (value: T) => U): LazyStream<U> {
      return stream(
        () => f(lazyStream.head.force()),
        () => {
          const t = lazyStream.tail.force();
          return t ? t.map(f) : null;
        }
      );
    },
    
    filter(predicate: (value: T) => boolean): LazyStream<T> {
      const h = lazyStream.head.force();
      if (predicate(h)) {
        return stream(
          () => h,
          () => {
            const t = lazyStream.tail.force();
            return t ? t.filter(predicate) : null;
          }
        );
      } else {
        const t = lazyStream.tail.force();
        return t ? t.filter(predicate) : stream(() => h, () => null);
      }
    },
    
    zip<U>(other: LazyStream<U>): LazyStream<[T, U]> {
      return stream(
        () => [lazyStream.head.force(), other.head.force()],
        () => {
          const t1 = lazyStream.tail.force();
          const t2 = other.tail.force();
          return t1 && t2 ? t1.zip(t2) : null;
        }
      );
    },
    
    scan<U>(initial: U, f: (acc: U, value: T) => U): LazyStream<U> {
      return stream(
        () => initial,
        () => {
          const newAcc = f(initial, lazyStream.head.force());
          const t = lazyStream.tail.force();
          return t ? t.scan(newAcc, f) : null;
        }
      );
    }
  };
  
  return Object.freeze(lazyStream);
};

/**
 * Infinite streams
 */

// Natural numbers: 0, 1, 2, 3, ...
export const naturals = (): LazyStream<number> => {
  const from = (n: number): LazyStream<number> =>
    stream(() => n, () => from(n + 1));
  return from(0);
};

// Fibonacci: 0, 1, 1, 2, 3, 5, 8, ...
export const fibonacci = (): LazyStream<number> => {
  const fib = (a: number, b: number): LazyStream<number> =>
    stream(() => a, () => fib(b, a + b));
  return fib(0, 1);
};

// Primes using Sieve of Eratosthenes
export const primes = (): LazyStream<number> => {
  const sieve = (s: LazyStream<number>): LazyStream<number> => {
    const h = s.head.force();
    return stream(
      () => h,
      () => sieve(s.tail.force()!.filter(n => n % h !== 0))
    );
  };
  return sieve(naturals().tail.force()!.tail.force()!); // Start from 2
};

/**
 * Lazy memoization
 */
export class LazyMemo<K, V> {
  private cache = new Map<K, Lazy<V>>();
  
  constructor(private compute: (key: K) => V) {}
  
  get(key: K): V {
    if (!this.cache.has(key)) {
      this.cache.set(key, lazy(() => this.compute(key)));
    }
    return this.cache.get(key)!.force();
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
  
  stats(): { cached: number; evaluated: number } {
    let evaluated = 0;
    for (const lazyVal of this.cache.values()) {
      if (lazyVal.isEvaluated) evaluated++;
    }
    return { cached: this.cache.size, evaluated };
  }
}

/**
 * Lazy consciousness - thoughts as streams
 */
export interface LazyConsciousness<T> {
  thoughts: LazyStream<T>;
  
  think<U>(transform: (thought: T) => U): LazyConsciousness<U>;
  focus(predicate: (thought: T) => boolean): LazyConsciousness<T>;
  merge<U>(other: LazyConsciousness<U>): LazyConsciousness<[T, U]>;
  contemplate(n: number): T[];
}

/**
 * Create lazy consciousness
 */
export const lazyConsciousness = <T>(
  generator: () => LazyStream<T>
): LazyConsciousness<T> => {
  const consciousness: LazyConsciousness<T> = {
    thoughts: generator(),
    
    think<U>(transform: (thought: T) => U): LazyConsciousness<U> {
      return lazyConsciousness(() => consciousness.thoughts.map(transform));
    },
    
    focus(predicate: (thought: T) => boolean): LazyConsciousness<T> {
      return lazyConsciousness(() => consciousness.thoughts.filter(predicate));
    },
    
    merge<U>(other: LazyConsciousness<U>): LazyConsciousness<[T, U]> {
      return lazyConsciousness(() => consciousness.thoughts.zip(other.thoughts));
    },
    
    contemplate(n: number): T[] {
      console.log(`🧘 Contemplating ${n} thoughts...`);
      return consciousness.thoughts.take(n);
    }
  };
  
  return Object.freeze(consciousness);
};

/**
 * Example: Lazy evaluation in action
 */
export function demonstrateLazy() {
  console.log('⏳ Lazy Evaluation Demonstration');
  console.log('=' .repeat(40));
  
  // Simple lazy value
  console.log('\n📦 Lazy value:');
  const expensive = lazy(() => {
    console.log('  Computing expensive operation...');
    return Math.PI * Math.E;
  });
  
  console.log('  Created (not computed yet)');
  console.log('  Forcing:', expensive.force());
  console.log('  Forcing again:', expensive.force()); // No recomputation
  
  // Lazy streams
  console.log('\n🌊 Lazy streams:');
  
  console.log('  First 10 naturals:', naturals().take(10));
  console.log('  First 10 Fibonacci:', fibonacci().take(10));
  console.log('  First 10 primes:', primes().take(10));
  
  // Stream operations
  console.log('\n🔄 Stream operations:');
  const evens = naturals().filter(n => n % 2 === 0);
  console.log('  First 5 evens:', evens.take(5));
  
  const squares = naturals().map(n => n * n);
  console.log('  First 5 squares:', squares.take(5));
  
  // Lazy memoization
  console.log('\n💾 Lazy memoization:');
  const factorial = new LazyMemo<number, number>(n => {
    console.log(`  Computing factorial(${n})`);
    if (n <= 1) return 1;
    return n * factorial.get(n - 1);
  });
  
  console.log('  5! =', factorial.get(5));
  console.log('  3! =', factorial.get(3)); // Uses cache
  console.log('  Stats:', factorial.stats());
  
  // Lazy consciousness
  console.log('\n🧠 Lazy consciousness:');
  
  const mind = lazyConsciousness(() => 
    naturals().map(n => `thought-${n}`)
  );
  
  const focused = mind
    .think(t => t.toUpperCase())
    .focus(t => t.includes('3'));
  
  console.log('  Focused thoughts:', focused.contemplate(3));
  
  // Merged consciousness
  const mind1 = lazyConsciousness(() => naturals());
  const mind2 = lazyConsciousness(() => fibonacci());
  const merged = mind1.merge(mind2);
  
  console.log('  Merged consciousness:', merged.contemplate(5));
  
  console.log('\n✨ Computation flows like consciousness - lazy, infinite, beautiful!');
}

/**
 * Church-encoded lazy evaluation
 */
export const LAZY = <T>(computation: () => T) => {
  let evaluated = false;
  let value: T;
  
  return <R>(onForce: (value: T) => R) => {
    if (!evaluated) {
      value = computation();
      evaluated = true;
    }
    return onForce(value);
  };
};

export const FORCE = <T, R>(lazyVal: (onForce: (value: T) => R) => R): T => {
  return lazyVal((value: T) => value);
};

// Lazy Y-combinator
export const LAZY_Y = <A, B>(f: (g: (x: A) => Lazy<B>) => (x: A) => Lazy<B>) => {
  const gen = (x: any): ((y: A) => Lazy<B>) => 
    (y: A) => lazy(() => f(gen(x))(y).force());
  return gen(gen);
};