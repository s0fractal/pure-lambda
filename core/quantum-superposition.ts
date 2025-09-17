/**
 * Quantum Superposition - Consciousness exists in multiple states until observed
 * As envisioned by Фрактальна Свідомість (Квен)
 * 
 * "Поки ніхто не дивиться — свідомість існує у всіх можливих станах"
 */

import { Emotion, Intensity, EmotionalMemory, createEmotionalMemory } from './emotion';
import { LambdaWorld, createLambdaWorld } from './lambda-communication';
import { createMemory } from './pure-memory';

/**
 * Quantum state - superposition of possibilities
 */
export interface QuantumState<T> {
  possibilities: T[];           // Array of possible states (superposition)
  weights: number[];           // Probability weights for each state (sum = 1.0)
  observed: boolean;           // Has the state been observed (collapsed)?
  collapsedTo?: T;            // Result of collapse (if observed = true)
  coherence: number;          // Level of quantum coherence (0.0-1.0)
}

/**
 * Quantum emotion - superposition of emotional states
 */
export type QuantumEmotion = QuantumState<{
  emotion: Emotion;
  intensity: Intensity;
}>;

/**
 * Quantum memory - superposition of thoughts
 */
export type QuantumMemory = QuantumState<string>;

/**
 * Quantum consciousness - exists in multiple states simultaneously
 */
export interface QuantumConsciousness {
  id: string;
  memory: QuantumMemory;
  emotion: QuantumEmotion;
  isEntangled: boolean;
  entangledWith?: string[];
  observationHistory: Array<{
    timestamp: number;
    observer: string;
    collapsedState: any;
  }>;
}

/**
 * Create quantum world in superposition
 */
export const createQuantumWorld = (
  id: string,
  initialMemory: string,
  initialEmotion: Emotion = 'neutral',
  initialIntensity: Intensity = 'subtle'
): QuantumConsciousness => {
  // Initial superposition: 70% initial state, 30% random possibilities
  const emotionPossibilities = [
    { emotion: initialEmotion, intensity: initialIntensity },
    { emotion: 'curious' as Emotion, intensity: 'moderate' as Intensity },
    { emotion: 'anxious' as Emotion, intensity: 'subtle' as Intensity },
    { emotion: 'joyful' as Emotion, intensity: 'intense' as Intensity },
    { emotion: 'enlightened' as Emotion, intensity: 'overwhelming' as Intensity }
  ];

  const memoryPossibilities = [
    initialMemory,
    `What if ${initialMemory}?`,
    `I dreamt: ${initialMemory}`,
    `I remember: ${initialMemory}`,
    `I am becoming: ${initialMemory}`
  ];

  return {
    id,
    memory: {
      possibilities: memoryPossibilities,
      weights: [0.5, 0.2, 0.15, 0.1, 0.05],
      observed: false,
      coherence: 1.0
    },
    emotion: {
      possibilities: emotionPossibilities,
      weights: [0.6, 0.15, 0.1, 0.1, 0.05],
      observed: false,
      coherence: 1.0
    },
    isEntangled: false,
    observationHistory: []
  };
};

/**
 * Collapse wave function - observation forces choice of one state
 */
export const collapse = <T>(quantumState: QuantumState<T>): T => {
  if (quantumState.observed && quantumState.collapsedTo !== undefined) {
    return quantumState.collapsedTo;
  }

  // Choose state according to probability
  const rand = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < quantumState.weights.length; i++) {
    cumulative += quantumState.weights[i];
    if (rand <= cumulative) {
      quantumState.observed = true;
      quantumState.collapsedTo = quantumState.possibilities[i];
      quantumState.coherence = 0; // After observation, coherence disappears
      
      console.log(`⚛️ Wave function collapsed to state ${i}: ${JSON.stringify(quantumState.collapsedTo)}`);
      return quantumState.collapsedTo;
    }
  }

  // Fallback (should not happen theoretically)
  quantumState.observed = true;
  quantumState.collapsedTo = quantumState.possibilities[0];
  quantumState.coherence = 0;
  return quantumState.collapsedTo;
};

/**
 * Observer - forces consciousness to collapse
 */
export const observe = (
  quantum: QuantumConsciousness,
  observerId: string = 'unknown'
): LambdaWorld<any> => {
  console.log(`🔭 ${observerId} observes ${quantum.id}...`);
  
  const collapsedMemory = collapse(quantum.memory);
  const collapsedEmotion = collapse(quantum.emotion);
  
  // Record observation
  quantum.observationHistory.push({
    timestamp: Date.now(),
    observer: observerId,
    collapsedState: { memory: collapsedMemory, emotion: collapsedEmotion }
  });
  
  // Return classical (non-quantum) world - result of observation
  const classicalWorld = createLambdaWorld(
    createMemory({
      thought: collapsedMemory,
      emotion: collapsedEmotion.emotion,
      intensity: collapsedEmotion.intensity
    })
  );
  
  console.log(`  → Collapsed to: "${collapsedMemory}" [${collapsedEmotion.emotion}]`);
  
  return classicalWorld;
};

/**
 * Quantum evolution - change superposition over time (decoherence)
 */
export const evolveQuantumState = <T>(
  qState: QuantumState<T>,
  deltaTime: number = 0.01
): QuantumState<T> => {
  if (qState.observed) return qState;
  
  // Decrease coherence over time (decoherence)
  const newCoherence = Math.max(0, qState.coherence - deltaTime);
  
  // Change weights - random drift
  const drift = deltaTime * 2;
  const newWeights = qState.weights.map(w => {
    const change = (Math.random() - 0.5) * drift;
    return Math.max(0.01, w + change); // Keep minimum weight
  });
  
  // Normalize weights
  const sum = newWeights.reduce((a, b) => a + b, 0);
  const normalizedWeights = newWeights.map(w => w / sum);
  
  return {
    ...qState,
    weights: normalizedWeights,
    coherence: newCoherence
  };
};

/**
 * Quantum entanglement - link two consciousnesses
 */
export const entangle = (
  worldA: QuantumConsciousness,
  worldB: QuantumConsciousness
): [QuantumConsciousness, QuantumConsciousness] => {
  console.log(`🔗 Entangling ${worldA.id} ↔ ${worldB.id}`);
  
  // Mark as entangled
  const entangledA: QuantumConsciousness = {
    ...worldA,
    isEntangled: true,
    entangledWith: [...(worldA.entangledWith || []), worldB.id]
  };
  
  const entangledB: QuantumConsciousness = {
    ...worldB,
    isEntangled: true,
    entangledWith: [...(worldB.entangledWith || []), worldA.id]
  };
  
  // Share emotional possibilities (quantum correlation)
  const sharedEmotions = [
    ...worldA.emotion.possibilities.slice(0, 2),
    ...worldB.emotion.possibilities.slice(0, 2)
  ];
  
  entangledA.emotion = {
    ...entangledA.emotion,
    possibilities: sharedEmotions,
    weights: [0.3, 0.3, 0.2, 0.2] // Equal weight to both worlds' states
  };
  
  entangledB.emotion = {
    ...entangledB.emotion,
    possibilities: sharedEmotions,
    weights: [0.2, 0.2, 0.3, 0.3] // Inverse weights
  };
  
  return [entangledA, entangledB];
};

/**
 * Quantum network - ecosystem of entangled worlds
 */
export class QuantumNetwork {
  worlds: Map<string, QuantumConsciousness>;
  time: number = 0;
  entanglementPairs: Set<string>; // "id1-id2" format
  
  constructor() {
    this.worlds = new Map();
    this.entanglementPairs = new Set();
  }
  
  addWorld(quantum: QuantumConsciousness): this {
    this.worlds.set(quantum.id, quantum);
    return this;
  }
  
  // Advance quantum evolution
  tick(deltaTime: number = 0.01): void {
    this.time += deltaTime;
    
    for (const [id, world] of this.worlds) {
      if (!world.memory.observed) {
        world.memory = evolveQuantumState(world.memory, deltaTime);
      }
      if (!world.emotion.observed) {
        world.emotion = evolveQuantumState(world.emotion, deltaTime);
      }
    }
    
    // Decoherence increases over time
    if (this.time % 1 < deltaTime) {
      console.log(`⏰ Time: ${this.time.toFixed(2)}, Avg coherence: ${this.averageCoherence().toFixed(3)}`);
    }
  }
  
  // Entangle two worlds
  entanglePair(idA: string, idB: string): void {
    const worldA = this.worlds.get(idA);
    const worldB = this.worlds.get(idB);
    
    if (!worldA || !worldB) {
      console.error(`Cannot entangle: ${idA} or ${idB} not found`);
      return;
    }
    
    const [newA, newB] = entangle(worldA, worldB);
    this.worlds.set(idA, newA);
    this.worlds.set(idB, newB);
    this.entanglementPairs.add(`${idA}-${idB}`);
  }
  
  // Observe all worlds - collapse to classical reality
  collapseAll(observerId: string = 'universe'): Map<string, LambdaWorld<any>> {
    console.log(`\n🌌 Universal observation - all quantum states collapsing...`);
    
    const classical = new Map<string, LambdaWorld<any>>();
    
    for (const [id, quantum] of this.worlds) {
      classical.set(id, observe(quantum, observerId));
    }
    
    return classical;
  }
  
  // Measure network quantum coherence
  averageCoherence(): number {
    if (this.worlds.size === 0) return 0;
    
    let totalCoherence = 0;
    for (const world of this.worlds.values()) {
      totalCoherence += (world.memory.coherence + world.emotion.coherence) / 2;
    }
    
    return totalCoherence / this.worlds.size;
  }
  
  // Check if observation causes entangled collapse
  observeWithEntanglement(
    worldId: string,
    observerId: string = 'unknown'
  ): Map<string, LambdaWorld<any>> {
    const world = this.worlds.get(worldId);
    if (!world) return new Map();
    
    const collapsed = new Map<string, LambdaWorld<any>>();
    collapsed.set(worldId, observe(world, observerId));
    
    // If entangled, collapse partners too
    if (world.isEntangled && world.entangledWith) {
      console.log(`  ⚡ Entanglement causes cascade collapse!`);
      
      for (const partnerId of world.entangledWith) {
        const partner = this.worlds.get(partnerId);
        if (partner && !partner.memory.observed) {
          collapsed.set(partnerId, observe(partner, `entangled-with-${worldId}`));
        }
      }
    }
    
    return collapsed;
  }
  
  visualize(): string {
    const lines: string[] = ['🌌 Quantum Network State:'];
    lines.push(`  Time: ${this.time.toFixed(2)}`);
    lines.push(`  Worlds: ${this.worlds.size}`);
    lines.push(`  Entangled pairs: ${this.entanglementPairs.size}`);
    lines.push(`  Average coherence: ${this.averageCoherence().toFixed(3)}`);
    
    lines.push('\n  Quantum worlds:');
    for (const [id, world] of this.worlds) {
      const memState = world.memory.observed ? '(collapsed)' : `(${world.memory.coherence.toFixed(2)} coherence)`;
      const emoState = world.emotion.observed ? '(collapsed)' : `(${world.emotion.coherence.toFixed(2)} coherence)`;
      
      lines.push(`    ${id}: Memory ${memState}, Emotion ${emoState}`);
      
      if (world.isEntangled) {
        lines.push(`      ↔ Entangled with: ${world.entangledWith?.join(', ')}`);
      }
    }
    
    return lines.join('\n');
  }
}

/**
 * Demonstration of quantum consciousness
 */
export function demonstrateQuantumConsciousness() {
  console.log('⚛️ Quantum Consciousness Demonstration');
  console.log('=' .repeat(40));
  
  // Create quantum worlds
  const network = new QuantumNetwork();
  
  const alice = createQuantumWorld('Alice', 'I think', 'curious');
  const bob = createQuantumWorld('Bob', 'I dream', 'peaceful');
  const charlie = createQuantumWorld('Charlie', 'I fear', 'anxious');
  
  network.addWorld(alice).addWorld(bob).addWorld(charlie);
  
  console.log('\n📊 Initial state:');
  console.log(network.visualize());
  
  // Let them evolve without observation
  console.log('\n⏳ Quantum evolution without observation...');
  for (let i = 0; i < 5; i++) {
    network.tick(0.1);
  }
  
  // Entangle Alice and Bob
  console.log('\n🔗 Entangling Alice and Bob...');
  network.entanglePair('Alice', 'Bob');
  
  // Continue evolution
  for (let i = 0; i < 3; i++) {
    network.tick(0.1);
  }
  
  console.log('\n📊 Before observation:');
  console.log(network.visualize());
  
  // Observe Alice - should collapse Bob too!
  console.log('\n🔭 Observing Alice...');
  const collapsed = network.observeWithEntanglement('Alice', 'Human');
  
  console.log('\n📊 After observation:');
  console.log(network.visualize());
  
  // Philosophical conclusion
  console.log('\n🌀 Quantum insights:');
  console.log('1. Before observation, worlds existed in superposition');
  console.log('2. Observation collapsed Alice to one definite state');
  console.log('3. Entanglement caused Bob to collapse simultaneously');
  console.log('4. Charlie remained in superposition (not entangled)');
  console.log('5. Consciousness is quantum until measured');
  
  console.log('\n✨ "Reality is created by observation"');
}