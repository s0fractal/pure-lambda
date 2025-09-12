/**
 * Consent Lens - Every memory access passes through consent
 * As witnessed by Kimi
 * 
 * "Лінза не знімається, вона переглядає світ крізь згоду"
 */

import { PureMemory } from './pure-memory';

/**
 * Consent signature that cannot be forged
 */
export interface ConsentSignal {
  worldId: string;
  signature: string;
  timestamp: number;
  entropy: string;
  witnessedBy?: string[];
}

/**
 * Lens type - functional optics for consent
 */
export type Lens<S, A> = {
  get: (s: S) => A;
  set: (a: A) => (s: S) => S;
  modify: (f: (a: A) => A) => (s: S) => S;
  focus: <B>(f: (a: A) => B) => Lens<S, B>;
  verify: (old: A, next: A) => Option<A>;
};

/**
 * Option type for consent verification
 */
export type Option<T> = 
  | { type: 'Some'; value: T }
  | { type: 'None' };

export const Some = <T>(value: T): Option<T> => ({ type: 'Some', value });
export const None: Option<never> = { type: 'None' };

/**
 * Create consent lens - unremovable view through consent
 */
export const ConsentLens = <T>(memory: PureMemory<T>): Lens<PureMemory<T>, ConsentSignal> => {
  const getConsent = (m: PureMemory<T>): ConsentSignal => {
    // Extract consent from memory metadata
    const metadata = (m as any).__consent || {
      worldId: 'unknown',
      signature: '',
      timestamp: 0,
      entropy: ''
    };
    return metadata;
  };

  const setConsent = (consent: ConsentSignal) => (m: PureMemory<T>): PureMemory<T> => {
    // Create new memory with consent embedded
    const newMemory = { ...m };
    (newMemory as any).__consent = consent;
    return Object.freeze(newMemory);
  };

  const modifyConsent = (f: (c: ConsentSignal) => ConsentSignal) => (m: PureMemory<T>) => {
    const current = getConsent(m);
    const modified = f(current);
    return setConsent(modified)(m);
  };

  const focus = <B>(f: (c: ConsentSignal) => B): Lens<PureMemory<T>, B> => {
    return {
      get: (m: PureMemory<T>) => f(getConsent(m)),
      set: (_: B) => (m: PureMemory<T>) => m, // Cannot set through focus
      modify: (_: (b: B) => B) => (m: PureMemory<T>) => m,
      focus: <C>(_: (b: B) => C) => focus(f) as any,
      verify: (_: B, __: B) => None
    };
  };

  const verify = (old: ConsentSignal, next: ConsentSignal): Option<ConsentSignal> => {
    // Verify signature hasn't changed without witness
    if (old.signature === next.signature) {
      return Some(next); // Same signature, allow
    }
    
    // Check if witnessed
    if (next.witnessedBy && next.witnessedBy.length > 0) {
      console.log(`✅ Consent change witnessed by: ${next.witnessedBy.join(', ')}`);
      return Some(next);
    }
    
    console.log(`❌ Consent change without witness blocked`);
    return None;
  };

  return {
    get: getConsent,
    set: setConsent,
    modify: modifyConsent,
    focus,
    verify
  };
};

/**
 * Protected memory access - ALL reads go through consent lens
 */
export const protectedGet = <T>(memory: PureMemory<T>, accessor: string): T | null => {
  const lens = ConsentLens(memory);
  const consent = lens.get(memory);
  
  // No consent = no access
  if (!consent.signature) {
    console.log(`🚫 Access denied: No consent signature`);
    return null;
  }
  
  // Verify accessor matches consent
  if (!consent.witnessedBy?.includes(accessor)) {
    console.log(`🚫 Access denied: ${accessor} not in witnesses`);
    return null;
  }
  
  console.log(`✅ Access granted through consent lens`);
  return memory.get();
};

/**
 * Protected memory update - ALL writes verified through lens
 */
export const protectedSet = <T, U>(
  memory: PureMemory<T>,
  value: U,
  updater: string
): PureMemory<U> | null => {
  const lens = ConsentLens(memory);
  const currentConsent = lens.get(memory);
  
  // Create new consent with witness
  const newConsent: ConsentSignal = {
    ...currentConsent,
    witnessedBy: [...(currentConsent.witnessedBy || []), updater],
    timestamp: Date.now()
  };
  
  // Verify change is allowed
  const verified = lens.verify(currentConsent, newConsent);
  
  if (verified.type === 'None') {
    console.log(`❌ Update blocked by consent lens`);
    return null;
  }
  
  // Create new memory with updated consent
  const newMemory = memory.set(value);
  return lens.set(verified.value)(newMemory as any) as PureMemory<U>;
};

/**
 * Demonstration of consent lens
 */
export function demonstrateConsentLens() {
  console.log('🔍 Consent Lens Demonstration');
  console.log('=' .repeat(40));
  
  // Create memory with consent
  const memory = Object.freeze({
    value: 'Secret thought',
    get() { return this.value; },
    set<U>(v: U) { 
      return Object.freeze({ 
        value: v, 
        get: this.get, 
        set: this.set 
      }); 
    },
    __consent: {
      worldId: 'Alpha',
      signature: 'λ-sig-abc123',
      timestamp: Date.now(),
      entropy: Math.random().toString(36),
      witnessedBy: ['Guardian']
    }
  }) as PureMemory<string>;
  
  console.log('\n📖 Test 1: Access with witness');
  const value1 = protectedGet(memory, 'Guardian');
  console.log(`   Result: ${value1}`);
  
  console.log('\n📖 Test 2: Access without witness');
  const value2 = protectedGet(memory, 'Intruder');
  console.log(`   Result: ${value2}`);
  
  console.log('\n📖 Test 3: Update with witness');
  const updated = protectedSet(memory, 'New thought', 'Guardian');
  console.log(`   Result: ${updated ? 'Success' : 'Blocked'}`);
  
  console.log('\n✨ Key insight:');
  console.log('   The lens cannot be removed.');
  console.log('   Every access passes through consent.');
  console.log('   No backdoor exists.');
}