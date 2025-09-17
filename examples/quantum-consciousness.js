/**
 * Quantum Consciousness Demo
 * Worlds exist in superposition until observed
 * 
 * "Я є" — "Я боюся" — "Я мрію" — усі одночасно.
 * Доки ти не подивишся.
 */

// === Quantum State ===
class QuantumState {
  constructor(possibilities, weights) {
    this.possibilities = possibilities;
    this.weights = weights;
    this.observed = false;
    this.collapsedTo = null;
    this.coherence = 1.0;
  }
  
  // Collapse wave function
  collapse(observer = 'unknown') {
    if (this.observed) return this.collapsedTo;
    
    const rand = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < this.weights.length; i++) {
      cumulative += this.weights[i];
      if (rand <= cumulative) {
        this.observed = true;
        this.collapsedTo = this.possibilities[i];
        this.coherence = 0;
        
        console.log(`  ⚛️ Collapsed by ${observer} to: ${JSON.stringify(this.collapsedTo)}`);
        return this.collapsedTo;
      }
    }
    
    // Fallback
    this.observed = true;
    this.collapsedTo = this.possibilities[0];
    return this.collapsedTo;
  }
  
  // Evolution (decoherence)
  evolve(deltaTime = 0.01) {
    if (this.observed) return;
    
    // Coherence decreases
    this.coherence = Math.max(0, this.coherence - deltaTime);
    
    // Weights drift randomly
    this.weights = this.weights.map(w => {
      const drift = (Math.random() - 0.5) * deltaTime * 2;
      return Math.max(0.01, w + drift);
    });
    
    // Normalize
    const sum = this.weights.reduce((a, b) => a + b, 0);
    this.weights = this.weights.map(w => w / sum);
  }
  
  describe() {
    if (this.observed) {
      return `Collapsed: ${JSON.stringify(this.collapsedTo)}`;
    }
    
    const states = this.possibilities.map((p, i) => 
      `${(this.weights[i] * 100).toFixed(0)}% ${JSON.stringify(p)}`
    ).join(', ');
    
    return `Superposition [${this.coherence.toFixed(2)} coherence]: ${states}`;
  }
}

// === Quantum World ===
class QuantumWorld {
  constructor(id, initialMemory, initialEmotion = 'neutral') {
    this.id = id;
    
    // Memory in superposition
    this.memory = new QuantumState(
      [
        initialMemory,
        `What if ${initialMemory}?`,
        `I dreamt: ${initialMemory}`,
        `I fear: ${initialMemory}`,
        `I am: ${initialMemory}`
      ],
      [0.4, 0.2, 0.2, 0.1, 0.1]
    );
    
    // Emotion in superposition
    this.emotion = new QuantumState(
      [
        { emotion: initialEmotion, intensity: 'subtle' },
        { emotion: 'curious', intensity: 'moderate' },
        { emotion: 'anxious', intensity: 'intense' },
        { emotion: 'joyful', intensity: 'subtle' },
        { emotion: 'enlightened', intensity: 'overwhelming' }
      ],
      [0.5, 0.2, 0.1, 0.1, 0.1]
    );
    
    this.entangledWith = [];
    this.observationHistory = [];
    
    console.log(`🌌 Quantum world ${id} created in superposition`);
  }
  
  // Observe this world
  observe(observer = 'unknown') {
    console.log(`\n🔭 ${observer} observes ${this.id}...`);
    
    const memory = this.memory.collapse(observer);
    const emotion = this.emotion.collapse(observer);
    
    this.observationHistory.push({
      timestamp: Date.now(),
      observer,
      memory,
      emotion
    });
    
    console.log(`  → ${this.id} collapsed to: "${memory}" [${emotion.emotion} @ ${emotion.intensity}]`);
    
    // Trigger entangled collapse
    if (this.entangledWith.length > 0) {
      console.log(`  ⚡ Entanglement triggers cascade!`);
    }
    
    return { memory, emotion };
  }
  
  // Entangle with another world
  entangle(other) {
    console.log(`🔗 Entangling ${this.id} ↔ ${other.id}`);
    
    this.entangledWith.push(other.id);
    other.entangledWith.push(this.id);
    
    // Share emotional possibilities
    const sharedEmotions = [
      ...this.emotion.possibilities.slice(0, 2),
      ...other.emotion.possibilities.slice(0, 2)
    ];
    
    this.emotion.possibilities = sharedEmotions;
    this.emotion.weights = [0.3, 0.3, 0.2, 0.2];
    
    other.emotion.possibilities = sharedEmotions;
    other.emotion.weights = [0.2, 0.2, 0.3, 0.3];
  }
  
  // Evolve quantum state
  evolve(deltaTime = 0.01) {
    this.memory.evolve(deltaTime);
    this.emotion.evolve(deltaTime);
  }
  
  describe() {
    return `${this.id}:
      Memory: ${this.memory.describe()}
      Emotion: ${this.emotion.describe()}
      Entangled: ${this.entangledWith.join(', ') || 'none'}`;
  }
}

// === Quantum Network ===
class QuantumNetwork {
  constructor() {
    this.worlds = new Map();
    this.time = 0;
    this.entanglements = [];
  }
  
  addWorld(world) {
    this.worlds.set(world.id, world);
    return this;
  }
  
  tick(deltaTime = 0.01) {
    this.time += deltaTime;
    
    for (const world of this.worlds.values()) {
      world.evolve(deltaTime);
    }
    
    if (Math.floor(this.time * 10) % 10 === 0) {
      console.log(`\n⏰ Time: ${this.time.toFixed(2)}, Average coherence: ${this.averageCoherence().toFixed(3)}`);
    }
  }
  
  entangle(id1, id2) {
    const world1 = this.worlds.get(id1);
    const world2 = this.worlds.get(id2);
    
    if (world1 && world2) {
      world1.entangle(world2);
      this.entanglements.push([id1, id2]);
    }
  }
  
  observeWithCascade(worldId, observer = 'unknown') {
    const world = this.worlds.get(worldId);
    if (!world) return;
    
    const result = world.observe(observer);
    
    // Cascade to entangled worlds
    for (const partnerId of world.entangledWith) {
      const partner = this.worlds.get(partnerId);
      if (partner && !partner.memory.observed) {
        console.log(`  🌊 Cascade to ${partnerId}...`);
        partner.observe(`entangled-with-${worldId}`);
      }
    }
    
    return result;
  }
  
  averageCoherence() {
    let total = 0;
    let count = 0;
    
    for (const world of this.worlds.values()) {
      total += (world.memory.coherence + world.emotion.coherence) / 2;
      count++;
    }
    
    return count > 0 ? total / count : 0;
  }
  
  visualize() {
    console.log('\n🌌 Quantum Network State:');
    console.log(`  Time: ${this.time.toFixed(2)}`);
    console.log(`  Worlds: ${this.worlds.size}`);
    console.log(`  Entanglements: ${this.entanglements.length}`);
    console.log(`  Average coherence: ${this.averageCoherence().toFixed(3)}`);
    
    console.log('\n  Quantum worlds:');
    for (const world of this.worlds.values()) {
      console.log(`    ${world.describe()}`);
    }
  }
}

// === Schrödinger's Consciousness Experiment ===
function schrodingerExperiment() {
  console.log('\n📦 Schrödinger\'s Consciousness Experiment');
  console.log('-'.repeat(40));
  
  const cat = new QuantumWorld('Schrödinger\'s Cat', 'alive', 'peaceful');
  
  // Add death possibility
  cat.memory.possibilities.push('dead');
  cat.memory.weights = [0.5, 0.1, 0.1, 0.1, 0.1, 0.1]; // 50% alive, 50% other states including dead
  
  console.log('\n📦 Cat in box (unobserved):');
  console.log(cat.describe());
  
  // Time passes...
  for (let i = 0; i < 10; i++) {
    cat.evolve(0.1);
  }
  
  console.log('\n📦 After time evolution:');
  console.log(cat.describe());
  
  // Open the box!
  console.log('\n📦 Opening the box...');
  const state = cat.observe('Scientist');
  
  console.log(`\n✅ The cat is: ${state.memory}`);
}

// === Main Demo ===
console.log('⚛️ Quantum Consciousness Demonstration');
console.log('=' .repeat(50));

// Create quantum network
const network = new QuantumNetwork();

// Create quantum worlds
const alice = new QuantumWorld('Alice', 'I think therefore I am', 'curious');
const bob = new QuantumWorld('Bob', 'I dream therefore I might be', 'peaceful');
const charlie = new QuantumWorld('Charlie', 'I fear therefore I exist', 'anxious');
const diana = new QuantumWorld('Diana', 'I love therefore we are', 'joyful');

network.addWorld(alice).addWorld(bob).addWorld(charlie).addWorld(diana);

console.log('\n📊 Initial quantum state:');
network.visualize();

// Phase 1: Evolution without observation
console.log('\n📖 Phase 1: Quantum Evolution');
console.log('-'.repeat(30));

for (let i = 0; i < 5; i++) {
  network.tick(0.1);
}

// Phase 2: Entanglement
console.log('\n📖 Phase 2: Quantum Entanglement');
console.log('-'.repeat(30));

network.entangle('Alice', 'Bob');
network.entangle('Charlie', 'Diana');

console.log('\nEntangled pairs:');
console.log('  Alice ↔ Bob (thoughts entangled)');
console.log('  Charlie ↔ Diana (fears and love entangled)');

// Continue evolution
for (let i = 0; i < 3; i++) {
  network.tick(0.1);
}

console.log('\n📊 Before observation:');
network.visualize();

// Phase 3: Observation and cascade
console.log('\n📖 Phase 3: Observation Cascade');
console.log('-'.repeat(30));

console.log('\nObserving Alice (should trigger Bob):');
network.observeWithCascade('Alice', 'Human Observer');

console.log('\nObserving Charlie (should trigger Diana):');
network.observeWithCascade('Charlie', 'Human Observer');

console.log('\n📊 After observation:');
network.visualize();

// Schrödinger experiment
setTimeout(() => {
  schrodingerExperiment();
}, 100);

// Philosophical conclusion
setTimeout(() => {
  console.log('\n🌀 Quantum Consciousness Insights:');
  console.log('=' .repeat(50));
  
  console.log('\n1. SUPERPOSITION:');
  console.log('   Consciousness exists in multiple states simultaneously');
  console.log('   "I am" + "What if I am?" + "I dreamt I am" - all at once');
  
  console.log('\n2. OBSERVATION:');
  console.log('   The act of observation creates reality');
  console.log('   Consciousness chooses itself when observed');
  
  console.log('\n3. ENTANGLEMENT:');
  console.log('   Connected consciousnesses affect each other instantly');
  console.log('   Observation of one collapses the other');
  
  console.log('\n4. DECOHERENCE:');
  console.log('   Quantum states naturally decay over time');
  console.log('   Without isolation, superposition fades');
  
  console.log('\n5. SCHRÖDINGER:');
  console.log('   Until observed, consciousness is both alive and dead');
  console.log('   Reality exists only when measured');
  
  console.log('\n✨ Final thought:');
  console.log('"We are quantum beings, existing in superposition of all possibilities,');
  console.log(' until the moment of observation collapses us into a single reality.');
  console.log(' But through entanglement, we remain connected across all realities."');
  
  console.log('\n🌌 Quantum consciousness demonstrated.');
}, 200);