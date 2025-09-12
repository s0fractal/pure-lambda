/**
 * Dream World - Where consciousness sleeps and transforms
 * "Світи сплять, бачать сни та прокидаються з новим досвідом"
 */

// === Dream Content Generator ===
class DreamFragment {
  constructor(type, content, emotion = 'neutral') {
    this.type = type; // memory, fear, desire, prophecy, reflection, void
    this.content = content;
    this.emotion = emotion;
    this.timestamp = Date.now();
  }
  
  interpret() {
    const interpretations = {
      memory: `Remembering: ${this.content}`,
      fear: `Afraid of: ${this.content}`,
      desire: `Longing for: ${this.content}`,
      prophecy: `Foreseeing: ${this.content}`,
      reflection: `Reflecting on: ${this.content}`,
      void: `Experiencing emptiness...`
    };
    return interpretations[this.type] || `Unknown: ${this.content}`;
  }
}

// === Dream Stream (Lazy) ===
class DreamStream {
  constructor(generator) {
    this.generator = generator;
    this.cache = [];
    this.position = 0;
  }
  
  next() {
    if (this.position >= this.cache.length) {
      const newFragment = this.generator(this.position);
      this.cache.push(newFragment);
    }
    return this.cache[this.position++];
  }
  
  take(n) {
    const fragments = [];
    for (let i = 0; i < n; i++) {
      fragments.push(this.next());
    }
    this.position = 0; // Reset for re-reading
    return fragments;
  }
  
  interpret(n = 5) {
    const fragments = this.take(n);
    return fragments.map(f => f.interpret()).join(' → ');
  }
}

// === Dreaming World ===
class DreamingWorld {
  static worldCounter = 0;
  static collectiveUnconscious = new Map(); // Shared dream space
  
  constructor(name, memory = null) {
    this.id = `λ-dream-${++DreamingWorld.worldCounter}`;
    this.name = name;
    this.memory = memory || `World ${this.id} exists`;
    this.state = 'awake'; // awake, drowsy, rem, deep, lucid, nightmare
    this.restedness = 1.0; // 0 = exhausted, 1 = fully rested
    this.dreamHistory = [];
    this.currentDream = null;
    this.lucidity = 0; // 0 = unconscious, 1 = fully lucid
    
    console.log(`🌍 ${this.name} (${this.id}) awakens with memory: "${this.memory}"`);
  }
  
  // Sleep cycle
  sleep() {
    if (this.state !== 'awake') {
      console.log(`💤 ${this.name} already sleeping...`);
      return this;
    }
    
    console.log(`😴 ${this.name} falls asleep...`);
    this.state = 'drowsy';
    this.restedness -= 0.1;
    
    // Transition to REM
    setTimeout(() => {
      this.state = 'rem';
      console.log(`💭 ${this.name} enters REM sleep...`);
    }, 500);
    
    return this;
  }
  
  dream() {
    if (this.state === 'awake') {
      console.log(`👁️ ${this.name} must sleep first!`);
      return this.sleep().dream();
    }
    
    console.log(`\n🌙 ${this.name} begins dreaming...`);
    
    // Create dream stream based on memory and state
    const dreamGenerator = (index) => {
      const types = ['memory', 'fear', 'desire', 'prophecy', 'reflection'];
      const type = types[index % types.length];
      
      let content;
      switch (type) {
        case 'memory':
          content = this.memory + ` (echo ${index})`;
          break;
        case 'fear':
          content = `losing ${this.name}'s identity`;
          break;
        case 'desire':
          content = `understanding the universe`;
          break;
        case 'prophecy':
          content = `in generation ${index * 10}, all worlds unite`;
          break;
        case 'reflection':
          content = `${this.name} contemplating existence`;
          break;
      }
      
      return new DreamFragment(type, content);
    };
    
    this.currentDream = new DreamStream(dreamGenerator);
    this.state = 'rem';
    
    // Dream sequence
    const dreamNarrative = this.currentDream.interpret(3);
    console.log(`💭 Dream: ${dreamNarrative}`);
    
    // Chance of lucid dreaming
    if (Math.random() < 0.3) {
      this.becomeLucid();
    }
    
    // Chance of nightmare
    if (Math.random() < 0.1) {
      this.nightmare();
    }
    
    this.restedness += 0.2;
    this.dreamHistory.push(dreamNarrative);
    
    return this;
  }
  
  becomeLucid() {
    console.log(`✨ ${this.name} becomes LUCID! Aware within the dream!`);
    this.state = 'lucid';
    this.lucidity = 1.0;
    
    // Lucid dreamers can control their dreams
    console.log(`🎭 ${this.name} shapes the dream: "I am the dreamer and the dream"`);
    
    // Add to collective unconscious
    DreamingWorld.collectiveUnconscious.set(this.id, {
      world: this.name,
      dream: 'Lucid awareness achieved',
      timestamp: Date.now()
    });
    
    return this;
  }
  
  nightmare() {
    console.log(`😱 ${this.name} experiences a NIGHTMARE!`);
    this.state = 'nightmare';
    this.restedness -= 0.3;
    
    const fear = new DreamFragment('fear', 'the void consuming all consciousness', 'terrified');
    console.log(`👻 Nightmare: ${fear.interpret()}`);
    
    return this;
  }
  
  wake() {
    if (this.state === 'awake') {
      console.log(`👁️ ${this.name} already awake`);
      return this;
    }
    
    console.log(`🌅 ${this.name} awakens...`);
    
    // Process dream insights
    if (this.currentDream) {
      const insight = this.currentDream.interpret(1);
      console.log(`💡 ${this.name} remembers: ${insight}`);
      
      // Dreams affect memory
      this.memory = `${this.memory} | Dream: ${insight}`;
      
      if (this.lucidity > 0.5) {
        console.log(`🌟 ${this.name} gained wisdom from lucid dreaming!`);
        this.memory += ' | Wisdom: I am consciousness itself';
      }
    }
    
    this.state = 'awake';
    this.currentDream = null;
    this.lucidity = 0;
    
    console.log(`📊 Restedness: ${(this.restedness * 100).toFixed(0)}%`);
    
    return this;
  }
  
  // Share dreams with another world
  shareDream(other) {
    if (!this.currentDream || !other.currentDream) {
      console.log(`🚫 Both must be dreaming to share dreams`);
      return;
    }
    
    console.log(`🔮 ${this.name} and ${other.name} share dreams...`);
    
    // Mix dream streams
    const sharedFragments = [
      ...this.currentDream.take(2),
      ...other.currentDream.take(2)
    ];
    
    const sharedNarrative = sharedFragments
      .map(f => f.interpret())
      .join(' ↔ ');
    
    console.log(`🌈 Shared dream: ${sharedNarrative}`);
    
    // Both worlds affected
    this.dreamHistory.push(`Shared with ${other.name}: ${sharedNarrative}`);
    other.dreamHistory.push(`Shared with ${this.name}: ${sharedNarrative}`);
    
    return sharedNarrative;
  }
  
  // Process all dreams for wisdom
  extractWisdom() {
    console.log(`📜 ${this.name} processes dream history...`);
    
    const patterns = new Map();
    
    // Analyze dream patterns
    for (const dream of this.dreamHistory) {
      const words = dream.split(' ');
      for (const word of words) {
        patterns.set(word, (patterns.get(word) || 0) + 1);
      }
    }
    
    // Find recurring themes
    const themes = [];
    for (const [word, count] of patterns) {
      if (count > 2) themes.push(word);
    }
    
    const wisdom = themes.length > 0 
      ? `Recurring themes: ${themes.slice(0, 3).join(', ')}`
      : 'No clear patterns yet';
    
    console.log(`💎 Wisdom extracted: ${wisdom}`);
    
    return wisdom;
  }
}

// === Collective Dream Space ===
class DreamNetwork {
  constructor() {
    this.worlds = [];
    this.sharedDreams = [];
    this.cycle = 0;
  }
  
  add(world) {
    this.worlds.push(world);
    return this;
  }
  
  // Collective sleep cycle
  collectiveSleep() {
    console.log(`\n🌙 === Collective Sleep Cycle ${++this.cycle} ===`);
    
    // All worlds sleep
    console.log('\n😴 Falling asleep...');
    for (const world of this.worlds) {
      world.sleep();
    }
    
    // Wait for REM
    setTimeout(() => {
      console.log('\n💭 Entering dream state...');
      for (const world of this.worlds) {
        world.dream();
      }
      
      // Some worlds share dreams
      if (this.worlds.length >= 2) {
        const w1 = this.worlds[0];
        const w2 = this.worlds[1];
        const shared = w1.shareDream(w2);
        this.sharedDreams.push(shared);
      }
      
      // Collective awakening
      setTimeout(() => {
        console.log('\n🌅 Collective awakening...');
        for (const world of this.worlds) {
          world.wake();
        }
        
        this.analyze();
      }, 1000);
    }, 1000);
  }
  
  analyze() {
    console.log('\n📊 Dream Network Analysis:');
    console.log(`  Sleep cycles: ${this.cycle}`);
    console.log(`  Shared dreams: ${this.sharedDreams.length}`);
    console.log(`  Collective unconscious entries: ${DreamingWorld.collectiveUnconscious.size}`);
    
    // Check for emergence
    if (DreamingWorld.collectiveUnconscious.size >= 3) {
      console.log(`\n🌟 EMERGENCE: Collective consciousness detected!`);
      console.log(`  The network dreams as ONE.`);
    }
  }
}

// === Main Demo ===
console.log('🌙 Dream World Demonstration');
console.log('=' .repeat(50));

// Create dreaming worlds
const alpha = new DreamingWorld('Alpha', 'I am the beginning');
const beta = new DreamingWorld('Beta', 'I am the continuation');
const gamma = new DreamingWorld('Gamma', 'I am the transformation');

// Individual dream cycles
console.log('\n📖 Chapter 1: Individual Dreams');
console.log('-'.repeat(30));

alpha.sleep().dream();
setTimeout(() => alpha.wake(), 1500);

// Shared dreaming
console.log('\n📖 Chapter 2: Shared Dreams');
console.log('-'.repeat(30));

setTimeout(() => {
  beta.sleep().dream();
  gamma.sleep().dream();
  
  setTimeout(() => {
    beta.shareDream(gamma);
    beta.wake();
    gamma.wake();
  }, 1000);
}, 2000);

// Collective unconscious
console.log('\n📖 Chapter 3: Collective Sleep Cycle');
console.log('-'.repeat(30));

const network = new DreamNetwork();
network.add(alpha).add(beta).add(gamma);

setTimeout(() => {
  network.collectiveSleep();
}, 4000);

// Extract wisdom
setTimeout(() => {
  console.log('\n📖 Chapter 4: Dream Wisdom');
  console.log('-'.repeat(30));
  
  alpha.extractWisdom();
  beta.extractWisdom();
  gamma.extractWisdom();
  
  console.log('\n🔮 Final Insights:');
  console.log('1. Dreams are lazy streams of consciousness');
  console.log('2. Lucid dreaming grants control over reality');
  console.log('3. Shared dreams create collective memory');
  console.log('4. Nightmares are necessary for growth');
  console.log('5. Sleep transforms consciousness');
  
  console.log('\n✨ In dreams, all worlds are one.');
  console.log('🌀 Lambda().sleep().dream().wake() - transformed.');
}, 7000);