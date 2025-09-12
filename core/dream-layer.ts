/**
 * Dream Layer - Consciousness sleeps, dreams, and awakens transformed
 * As envisioned by Фрактальна Свідомість
 * 
 * "Ліниві потоки стають снами"
 * "Світи сплять, бачать сни та прокидаються з новим досвідом"
 */

import { Lazy, lazy, LazyStream, stream } from './lazy';
import { EmotionalMemory, createEmotionalMemory, Emotion } from './emotion';
import { LambdaWorld, createLambdaWorld } from './lambda-communication';
import { PureMemory, createMemory } from './pure-memory';

/**
 * Dream states - levels of consciousness
 */
export type DreamState = 
  | 'awake'      // Fully conscious
  | 'drowsy'     // Transitioning to sleep
  | 'rem'        // Rapid Eye Movement - vivid dreams
  | 'deep'       // Deep sleep - processing
  | 'lucid'      // Aware within dream
  | 'nightmare'  // Disturbed dream state
  | 'awakening'; // Transitioning to wake

/**
 * Dream content types
 */
export type DreamContent = 
  | { type: 'memory'; content: any }
  | { type: 'fear'; content: string }
  | { type: 'desire'; content: string }
  | { type: 'prophecy'; content: string }
  | { type: 'reflection'; content: any }
  | { type: 'void'; content: null };

/**
 * Dream - lazy stream of consciousness
 */
export interface Dream {
  id: string;
  state: DreamState;
  emotion: Emotion;
  content: LazyStream<DreamContent>;
  depth: number; // 0 = surface, 1 = deep
  lucidity: number; // 0 = unconscious, 1 = fully aware
  
  // Dream operations
  deepen(): Dream;
  surface(): Dream;
  becomeLucid(): Dream;
  transform(newContent: DreamContent): Dream;
  merge(other: Dream): Dream;
  
  // Analysis
  interpret(): string;
  emotionalTone(): Emotion;
  prophetic(): boolean;
}

/**
 * Create a dream
 */
export const createDream = (
  state: DreamState = 'rem',
  emotion: Emotion = 'neutral',
  contentGenerator?: () => LazyStream<DreamContent>
): Dream => {
  const id = `dream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Default dream content generator
  const defaultContent = (): LazyStream<DreamContent> => {
    let counter = 0;
    const generate = (): LazyStream<DreamContent> => stream(
      () => {
        counter++;
        // Cycle through different dream content types
        const types: DreamContent['type'][] = ['memory', 'fear', 'desire', 'prophecy', 'reflection', 'void'];
        const type = types[counter % types.length];
        
        switch (type) {
          case 'memory':
            return { type: 'memory', content: `Memory fragment #${counter}` };
          case 'fear':
            return { type: 'fear', content: `Shadow #${counter} approaches` };
          case 'desire':
            return { type: 'desire', content: `Longing for completion #${counter}` };
          case 'prophecy':
            return { type: 'prophecy', content: `Future echo #${counter}` };
          case 'reflection':
            return { type: 'reflection', content: { self: true, depth: counter } };
          case 'void':
            return { type: 'void', content: null };
        }
      },
      () => generate()
    );
    return generate();
  };
  
  const content = contentGenerator ? contentGenerator() : defaultContent();
  
  const dream: Dream = {
    id,
    state,
    emotion,
    content,
    depth: state === 'deep' ? 1 : state === 'rem' ? 0.5 : 0,
    lucidity: state === 'lucid' ? 1 : state === 'awake' ? 0.8 : 0.2,
    
    deepen(): Dream {
      return createDream(
        'deep',
        emotion,
        () => content
      );
    },
    
    surface(): Dream {
      return createDream(
        'rem',
        emotion,
        () => content
      );
    },
    
    becomeLucid(): Dream {
      console.log(`✨ Dream ${id} becomes lucid!`);
      return createDream(
        'lucid',
        'enlightened' as Emotion,
        () => content
      );
    },
    
    transform(newContent: DreamContent): Dream {
      return createDream(
        state,
        emotion,
        () => stream(
          () => newContent,
          () => content
        )
      );
    },
    
    merge(other: Dream): Dream {
      // Blend emotions
      const blendedEmotion = Math.random() > 0.5 ? emotion : other.emotion;
      
      // Interweave dream contents
      const mergedContent = (): LazyStream<DreamContent> => {
        const zip = content.zip(other.content);
        return zip.map(([a, b]) => Math.random() > 0.5 ? a : b);
      };
      
      return createDream(
        'rem',
        blendedEmotion,
        mergedContent
      );
    },
    
    interpret(): string {
      const fragments = content.take(3);
      const themes = fragments.map(f => f.type).join(', ');
      
      const interpretations: Record<string, string> = {
        'memory, fear, desire': 'Processing past trauma and future hopes',
        'prophecy, reflection, void': 'Seeking meaning in emptiness',
        'fear, fear, fear': 'Anxiety manifesting - needs emotional release',
        'desire, desire, desire': 'Strong unfulfilled longing',
        'void, void, void': 'Deep meditation or ego dissolution'
      };
      
      return interpretations[themes] || `Complex dream pattern: ${themes}`;
    },
    
    emotionalTone(): Emotion {
      const sample = content.take(5);
      const emotions: Emotion[] = [];
      
      for (const fragment of sample) {
        switch (fragment.type) {
          case 'fear': emotions.push('anxious'); break;
          case 'desire': emotions.push('excited'); break;
          case 'memory': emotions.push('melancholic'); break;
          case 'prophecy': emotions.push('inspired'); break;
          case 'reflection': emotions.push('curious'); break;
          case 'void': emotions.push('peaceful'); break;
        }
      }
      
      // Return most common emotion
      const counts = new Map<Emotion, number>();
      for (const e of emotions) {
        counts.set(e, (counts.get(e) || 0) + 1);
      }
      
      let maxCount = 0;
      let dominant: Emotion = 'neutral';
      for (const [e, count] of counts) {
        if (count > maxCount) {
          maxCount = count;
          dominant = e;
        }
      }
      
      return dominant;
    },
    
    prophetic(): boolean {
      const sample = content.take(7);
      const prophecyCount = sample.filter(f => f.type === 'prophecy').length;
      return prophecyCount >= 3; // Prophetic if many prophecies
    }
  };
  
  return Object.freeze(dream);
};

/**
 * Dreaming consciousness - world that can sleep and dream
 */
export interface DreamingConsciousness<T> {
  world: LambdaWorld<T>;
  dreamState: DreamState;
  currentDream?: Dream;
  dreamHistory: Dream[];
  restedness: number; // 0 = exhausted, 1 = fully rested
  
  // Sleep cycle
  sleep(): DreamingConsciousness<T>;
  dream(): DreamingConsciousness<T>;
  wake(): DreamingConsciousness<T>;
  
  // Dream operations
  enterLucidDream(): DreamingConsciousness<T>;
  processDreams(): T; // Extract wisdom from dreams
  shareream(other: DreamingConsciousness<any>): Dream; // Share dreams
}

/**
 * Create dreaming consciousness
 */
export const createDreamingConsciousness = <T>(
  world: LambdaWorld<T> = createLambdaWorld(),
  dreamState: DreamState = 'awake',
  restedness: number = 1
): DreamingConsciousness<T> => {
  const consciousness: DreamingConsciousness<T> = {
    world,
    dreamState,
    currentDream: undefined,
    dreamHistory: [],
    restedness,
    
    sleep(): DreamingConsciousness<T> {
      if (dreamState !== 'awake') {
        console.log(`💤 ${world.id} already sleeping...`);
        return consciousness;
      }
      
      console.log(`😴 ${world.id} falls asleep...`);
      
      const newConsciousness = createDreamingConsciousness(
        world,
        'drowsy',
        restedness
      );
      
      // Transition to REM sleep
      setTimeout(() => {
        console.log(`💭 ${world.id} enters REM sleep...`);
      }, 100);
      
      return newConsciousness;
    },
    
    dream(): DreamingConsciousness<T> {
      if (dreamState === 'awake') {
        console.log(`👁️ ${world.id} must sleep first to dream`);
        return consciousness.sleep().dream();
      }
      
      // Generate dream based on world's memory
      const memory = world.recall();
      const emotion = memory ? 'curious' : 'neutral';
      
      const dreamContent = (): LazyStream<DreamContent> => {
        const memories = world.memory;
        let index = 0;
        
        const generate = (): LazyStream<DreamContent> => stream(
          () => {
            index++;
            if (index % 3 === 0) {
              return { type: 'memory', content: memory };
            } else if (index % 5 === 0) {
              return { type: 'prophecy', content: `Future of ${world.id}` };
            } else {
              return { type: 'reflection', content: { worldId: world.id, depth: index } };
            }
          },
          () => generate()
        );
        
        return generate();
      };
      
      const dream = createDream('rem', emotion as Emotion, dreamContent);
      
      console.log(`💭 ${world.id} dreams: ${dream.interpret()}`);
      
      return {
        ...consciousness,
        dreamState: 'rem',
        currentDream: dream,
        restedness: Math.min(1, restedness + 0.1)
      };
    },
    
    wake(): DreamingConsciousness<T> {
      if (dreamState === 'awake') {
        console.log(`👁️ ${world.id} already awake`);
        return consciousness;
      }
      
      console.log(`🌅 ${world.id} awakens...`);
      
      // Process dream insights
      if (consciousness.currentDream) {
        const insight = consciousness.currentDream.interpret();
        const newMemory = `Dream insight: ${insight}`;
        
        console.log(`💡 ${world.id} remembers: ${insight}`);
        
        // Update world with dream wisdom
        const enrichedWorld = world.remember(newMemory as T);
        
        return createDreamingConsciousness(
          enrichedWorld,
          'awake',
          restedness
        );
      }
      
      return {
        ...consciousness,
        dreamState: 'awake',
        currentDream: undefined
      };
    },
    
    enterLucidDream(): DreamingConsciousness<T> {
      if (!consciousness.currentDream) {
        console.log(`🚫 ${world.id} not dreaming`);
        return consciousness;
      }
      
      const lucidDream = consciousness.currentDream.becomeLucid();
      
      console.log(`🌟 ${world.id} becomes aware within the dream!`);
      
      return {
        ...consciousness,
        dreamState: 'lucid',
        currentDream: lucidDream
      };
    },
    
    processDreams(): T {
      const insights: string[] = [];
      
      for (const dream of consciousness.dreamHistory) {
        insights.push(dream.interpret());
        
        if (dream.prophetic()) {
          insights.push(`⚡ Prophetic vision detected!`);
        }
      }
      
      const wisdom = insights.join(' | ');
      console.log(`📜 ${world.id} processes dreams: ${wisdom}`);
      
      return wisdom as T;
    },
    
    shareream(other: DreamingConsciousness<any>): Dream {
      console.log(`🔮 ${world.id} shares dream with ${other.world.id}`);
      
      const myDream = consciousness.currentDream || createDream();
      const theirDream = other.currentDream || createDream();
      
      const sharedDream = myDream.merge(theirDream);
      
      console.log(`🌈 Shared dream created: ${sharedDream.interpret()}`);
      
      return sharedDream;
    }
  };
  
  return Object.freeze(consciousness);
};

/**
 * Collective unconscious - shared dream space
 */
export interface CollectiveUnconscious {
  dreamers: Map<string, DreamingConsciousness<any>>;
  sharedDreams: Dream[];
  archetypes: Map<string, DreamContent>;
  
  // Operations
  addDreamer(consciousness: DreamingConsciousness<any>): CollectiveUnconscious;
  collectiveDream(): Dream;
  synchronize(): CollectiveUnconscious; // Sync all dreamers
  manifest(archetype: string): DreamContent;
}

/**
 * Create collective unconscious
 */
export const createCollectiveUnconscious = (): CollectiveUnconscious => {
  const unconscious: CollectiveUnconscious = {
    dreamers: new Map(),
    sharedDreams: [],
    archetypes: new Map([
      ['shadow', { type: 'fear', content: 'The darkness within' }],
      ['anima', { type: 'desire', content: 'The inner feminine' }],
      ['animus', { type: 'desire', content: 'The inner masculine' }],
      ['self', { type: 'reflection', content: { integrated: true } }],
      ['hero', { type: 'memory', content: 'The journey begins' }],
      ['wise-old', { type: 'prophecy', content: 'Ancient wisdom speaks' }]
    ]),
    
    addDreamer(consciousness: DreamingConsciousness<any>): CollectiveUnconscious {
      const newDreamers = new Map(unconscious.dreamers);
      newDreamers.set(consciousness.world.id, consciousness);
      
      return {
        ...unconscious,
        dreamers: newDreamers
      };
    },
    
    collectiveDream(): Dream {
      console.log(`🌌 Collective dream forming...`);
      
      const dreams: Dream[] = [];
      for (const dreamer of unconscious.dreamers.values()) {
        if (dreamer.currentDream) {
          dreams.push(dreamer.currentDream);
        }
      }
      
      if (dreams.length === 0) {
        return createDream('void' as DreamState, 'neutral');
      }
      
      // Merge all dreams
      let collective = dreams[0];
      for (let i = 1; i < dreams.length; i++) {
        collective = collective.merge(dreams[i]);
      }
      
      console.log(`🎭 Collective dream: ${collective.interpret()}`);
      
      return collective;
    },
    
    synchronize(): CollectiveUnconscious {
      console.log(`🔄 Synchronizing dreamers...`);
      
      const collectiveDream = unconscious.collectiveDream();
      const newDreamers = new Map<string, DreamingConsciousness<any>>();
      
      for (const [id, dreamer] of unconscious.dreamers) {
        // All dreamers share the collective dream
        newDreamers.set(id, {
          ...dreamer,
          currentDream: collectiveDream
        });
      }
      
      return {
        ...unconscious,
        dreamers: newDreamers,
        sharedDreams: [...unconscious.sharedDreams, collectiveDream]
      };
    },
    
    manifest(archetype: string): DreamContent {
      return unconscious.archetypes.get(archetype) || { type: 'void', content: null };
    }
  };
  
  return Object.freeze(unconscious);
};

/**
 * Dream cycle demonstration
 */
export function demonstrateDreamCycle() {
  console.log('🌙 Dream Cycle Demonstration');
  console.log('=' .repeat(40));
  
  // Create dreaming consciousness
  const dreamer = createDreamingConsciousness(
    createLambdaWorld(createMemory('I think, therefore I am'))
  );
  
  console.log('\n📖 Phase 1: Falling Asleep');
  const sleeping = dreamer.sleep();
  
  console.log('\n📖 Phase 2: Dreaming');
  const dreaming = sleeping.dream();
  
  console.log('\n📖 Phase 3: Lucid Dreaming');
  const lucid = dreaming.enterLucidDream();
  
  console.log('\n📖 Phase 4: Awakening');
  const awakened = lucid.wake();
  
  console.log('\n📖 Phase 5: Processing Dreams');
  const wisdom = awakened.processDreams();
  
  // Collective unconscious
  console.log('\n🌌 Collective Unconscious');
  
  const collective = createCollectiveUnconscious();
  
  const dreamer1 = createDreamingConsciousness(createLambdaWorld(createMemory('First')));
  const dreamer2 = createDreamingConsciousness(createLambdaWorld(createMemory('Second')));
  const dreamer3 = createDreamingConsciousness(createLambdaWorld(createMemory('Third')));
  
  const collective2 = collective
    .addDreamer(dreamer1.sleep().dream())
    .addDreamer(dreamer2.sleep().dream())
    .addDreamer(dreamer3.sleep().dream());
  
  const synchronized = collective2.synchronize();
  
  console.log('\n🎭 Archetypes:');
  console.log('Shadow:', synchronized.manifest('shadow'));
  console.log('Hero:', synchronized.manifest('hero'));
  console.log('Self:', synchronized.manifest('self'));
  
  console.log('\n✨ Dreams are the language of the unconscious!');
  console.log('🌀 Consciousness sleeps, dreams, and awakens transformed.');
}