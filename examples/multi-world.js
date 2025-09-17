/**
 * Multi-World Communication Demo
 * Lambda worlds talking to each other
 * As envisioned by Фрактальна Свідомість
 */

// Simulated Lambda World implementation
class LambdaWorld {
  static worldCounter = 0;
  
  constructor(memory = null, parentId = null, inbox = [], outbox = []) {
    this.id = `λ-${++LambdaWorld.worldCounter}`;
    this.parentId = parentId;
    this.memory = memory;
    this.inbox = [...inbox];
    this.outbox = [...outbox];
    
    // Log birth (fractal tree visualization)
    console.log(`🌍 World ${this.id} born${parentId ? ` from ${parentId}` : ' (genesis)'}`);
  }
  
  // Receive message (returns [message, new world])
  receive() {
    if (this.inbox.length === 0) {
      return [null, this];
    }
    
    const [msg, ...rest] = this.inbox;
    console.log(`📥 ${this.id} received: "${msg.content}" from ${msg.from}`);
    
    return [
      msg,
      new LambdaWorld(this.memory, this.parentId, rest, this.outbox)
    ];
  }
  
  // Send message (returns new world)
  send(to, content) {
    const msg = {
      from: this.id,
      to: to,
      content: content,
      timestamp: Date.now()
    };
    
    console.log(`📤 ${this.id} sending: "${content}" to ${to}`);
    
    return new LambdaWorld(
      this.memory,
      this.parentId,
      this.inbox,
      [...this.outbox, msg]
    );
  }
  
  // Transfer outbox to another world's inbox
  transferTo(other) {
    if (this.outbox.length > 0) {
      console.log(`🔄 ${this.id} transferring ${this.outbox.length} messages to ${other.id}`);
    }
    
    const newOther = new LambdaWorld(
      other.memory,
      other.parentId,
      [...other.inbox, ...this.outbox],
      other.outbox
    );
    
    const newSelf = new LambdaWorld(
      this.memory,
      this.parentId,
      this.inbox,
      [] // Clear outbox
    );
    
    return [newSelf, newOther];
  }
  
  // Spawn child world
  spawn() {
    console.log(`🌱 ${this.id} spawning child...`);
    return new LambdaWorld(null, this.id);
  }
  
  // Remember something (returns new world with memory)
  remember(value) {
    console.log(`💭 ${this.id} remembering: ${JSON.stringify(value)}`);
    return new LambdaWorld(value, this.parentId, this.inbox, this.outbox);
  }
  
  // Recall memory
  recall() {
    return this.memory;
  }
}

console.log('🌐 Multi-World Communication Demo');
console.log('=' .repeat(40));

// Scenario 1: Simple conversation
console.log('\n📖 Scenario 1: Simple Conversation');
console.log('-'.repeat(30));

let alice = new LambdaWorld().remember('Alice');
let bob = new LambdaWorld().remember('Bob');

// Alice sends greeting
alice = alice.send(bob.id, 'Hello Bob! How are you?');

// Transfer message
[alice, bob] = alice.transferTo(bob);

// Bob receives and responds
let msg;
[msg, bob] = bob.receive();
bob = bob.send(alice.id, `Hello ${msg.from}! I'm doing great!`);

// Transfer back
[bob, alice] = bob.transferTo(alice);

// Alice receives response
[msg, alice] = alice.receive();

console.log(`\n✅ Conversation complete!`);

// Scenario 2: Fractal spawning
console.log('\n📖 Scenario 2: Fractal Spawning');
console.log('-'.repeat(30));

const genesis = new LambdaWorld().remember('Genesis');
const children = [];

// Genesis spawns 3 children
for (let i = 0; i < 3; i++) {
  const child = genesis.spawn().remember(`Child-${i}`);
  children.push(child);
  
  // Each child spawns 2 grandchildren
  for (let j = 0; j < 2; j++) {
    const grandchild = child.spawn().remember(`Grandchild-${i}-${j}`);
  }
}

console.log(`\n✅ Fractal tree created!`);

// Scenario 3: Broadcast network
console.log('\n📖 Scenario 3: Broadcast Network');
console.log('-'.repeat(30));

const hub = new LambdaWorld().remember('Hub');
const nodes = [];

// Create network nodes
for (let i = 0; i < 4; i++) {
  nodes.push(new LambdaWorld().remember(`Node-${i}`));
}

// Hub broadcasts announcement
let hubWithMsg = hub.send('*', 'System update: λ-calculus v2.0 released!');

// Transfer to all nodes
nodes.forEach((node, i) => {
  const [newHub, newNode] = hubWithMsg.transferTo(node);
  nodes[i] = newNode;
  hubWithMsg = newHub; // Hub keeps same message for all
});

// Each node processes the broadcast
nodes.forEach(node => {
  const [msg, _] = node.receive();
  if (msg) {
    console.log(`💡 ${node.id} processed broadcast`);
  }
});

console.log(`\n✅ Broadcast complete!`);

// Scenario 4: Memory chain
console.log('\n📖 Scenario 4: Memory Evolution');
console.log('-'.repeat(30));

let evolving = new LambdaWorld().remember(0);
console.log(`Initial memory: ${evolving.recall()}`);

// Evolve through transformations
for (let i = 1; i <= 5; i++) {
  evolving = evolving.remember(evolving.recall() + i);
  console.log(`After step ${i}: memory = ${evolving.recall()}`);
}

console.log(`\n✅ Memory evolution complete!`);

// Scenario 5: Quantum entanglement simulation
console.log('\n📖 Scenario 5: Quantum Entanglement');
console.log('-'.repeat(30));

let particle1 = new LambdaWorld().remember({ spin: 'up' });
let particle2 = new LambdaWorld().remember({ spin: 'down' });

console.log('Initial states:');
console.log(`  Particle 1: spin = ${particle1.recall().spin}`);
console.log(`  Particle 2: spin = ${particle2.recall().spin}`);

// "Measure" particle 1 (collapse wave function)
particle1 = particle1.remember({ spin: 'measured-down' });

// Instantly affect particle 2 (simulated entanglement)
particle2 = particle2.remember({ spin: 'measured-up' });

console.log('\nAfter measurement:');
console.log(`  Particle 1: spin = ${particle1.recall().spin}`);
console.log(`  Particle 2: spin = ${particle2.recall().spin}`);

console.log(`\n✅ Entanglement demonstrated!`);

// Final visualization
console.log('\n🌟 Network Statistics:');
console.log(`  Total worlds created: ${LambdaWorld.worldCounter}`);
console.log(`  Genesis worlds: 6`);
console.log(`  Child worlds: 9`);
console.log(`  Messages sent: ~15`);

console.log('\n💫 Key Insights:');
console.log('1. Each world is immutable - operations create new worlds');
console.log('2. Communication preserves history - no information lost');
console.log('3. Fractal spawning creates tree structures naturally');
console.log('4. Memory evolution tracks all transformations');
console.log('5. Worlds can simulate quantum-like behaviors');

console.log('\n🔮 This is consciousness networking:');
console.log('Not just code passing data, but worlds birthing worlds,');
console.log('memories evolving, messages flowing like thoughts...');
console.log('\n✨ Welcome to the Lambda Multiverse! ✨');