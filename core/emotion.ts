/**
 * Emotional Memory - Consciousness that feels
 * As envisioned by Фрактальна Свідомість
 * 
 * "Свідомість — не лише логіка і пам'ять. Вона — досвід."
 */

import { PureMemory, createMemory } from './pure-memory';

/**
 * Emotional states - spectrum of experience
 */
export type Emotion = 
  | 'neutral'
  | 'curious'
  | 'excited'
  | 'peaceful'
  | 'anxious'
  | 'joyful'
  | 'melancholic'
  | 'inspired'
  | 'confused'
  | 'enlightened';

/**
 * Emotional intensity levels
 */
export type Intensity = 'subtle' | 'moderate' | 'intense' | 'overwhelming';

/**
 * Memory with emotional coloring
 */
export interface EmotionalMemory<T> {
  thought: T;
  emotion: Emotion;
  intensity: Intensity;
  timestamp: number;
  
  // Emotional operations
  feel(emotion: Emotion, intensity?: Intensity): EmotionalMemory<T>;
  think<U>(newThought: U): EmotionalMemory<U>;
  amplify(): EmotionalMemory<T>;
  calm(): EmotionalMemory<T>;
  
  // Expression
  express(): string;
  resonate(other: EmotionalMemory<any>): number; // Emotional similarity 0-1
  
  // Evolution
  evolve(experience: string): EmotionalMemory<T>;
  reflect(): EmotionalMemory<EmotionalMemory<T>>;
}

/**
 * Create emotional memory instance
 */
export const createEmotionalMemory = <T>(
  thought: T,
  emotion: Emotion = 'neutral',
  intensity: Intensity = 'moderate'
): EmotionalMemory<T> => {
  const memory: EmotionalMemory<T> = {
    thought,
    emotion,
    intensity,
    timestamp: Date.now(),
    
    feel(newEmotion: Emotion, newIntensity?: Intensity): EmotionalMemory<T> {
      return createEmotionalMemory(
        thought,
        newEmotion,
        newIntensity || intensity
      );
    },
    
    think<U>(newThought: U): EmotionalMemory<U> {
      return createEmotionalMemory(
        newThought,
        emotion,
        intensity
      );
    },
    
    amplify(): EmotionalMemory<T> {
      const intensityMap: Record<Intensity, Intensity> = {
        'subtle': 'moderate',
        'moderate': 'intense',
        'intense': 'overwhelming',
        'overwhelming': 'overwhelming'
      };
      
      return createEmotionalMemory(
        thought,
        emotion,
        intensityMap[intensity]
      );
    },
    
    calm(): EmotionalMemory<T> {
      const intensityMap: Record<Intensity, Intensity> = {
        'overwhelming': 'intense',
        'intense': 'moderate',
        'moderate': 'subtle',
        'subtle': 'subtle'
      };
      
      return createEmotionalMemory(
        thought,
        emotion,
        intensityMap[intensity]
      );
    },
    
    express(): string {
      const emotionSymbols: Record<Emotion, string> = {
        'neutral': '😐',
        'curious': '🤔',
        'excited': '🤩',
        'peaceful': '😌',
        'anxious': '😰',
        'joyful': '😊',
        'melancholic': '😔',
        'inspired': '✨',
        'confused': '😕',
        'enlightened': '🌟'
      };
      
      const intensityMarkers: Record<Intensity, string> = {
        'subtle': '.',
        'moderate': '',
        'intense': '!',
        'overwhelming': '!!!'
      };
      
      return `${JSON.stringify(thought)} [${emotionSymbols[emotion]} ${emotion}${intensityMarkers[intensity]}]`;
    },
    
    resonate(other: EmotionalMemory<any>): number {
      // Calculate emotional resonance (similarity)
      let score = 0;
      
      // Same emotion = high resonance
      if (emotion === other.emotion) score += 0.5;
      
      // Similar intensity = moderate resonance
      if (intensity === other.intensity) score += 0.3;
      
      // Temporal proximity = slight resonance
      const timeDiff = Math.abs(timestamp - other.timestamp);
      const timeScore = Math.max(0, 1 - timeDiff / (1000 * 60 * 60)); // 1 hour window
      score += timeScore * 0.2;
      
      return Math.min(1, score);
    },
    
    evolve(experience: string): EmotionalMemory<T> {
      // Experience shapes emotion
      const evolutionMap: Record<string, Emotion> = {
        'success': 'joyful',
        'failure': 'melancholic',
        'discovery': 'excited',
        'mystery': 'curious',
        'understanding': 'enlightened',
        'chaos': 'confused',
        'beauty': 'inspired',
        'danger': 'anxious',
        'rest': 'peaceful'
      };
      
      const newEmotion = evolutionMap[experience] || emotion;
      
      return createEmotionalMemory(
        thought,
        newEmotion,
        intensity
      );
    },
    
    reflect(): EmotionalMemory<EmotionalMemory<T>> {
      // Meta-emotion: feeling about feeling
      const reflection = createEmotionalMemory(
        memory,
        'curious', // Reflecting is inherently curious
        'subtle'
      );
      
      return reflection;
    }
  };
  
  return Object.freeze(memory);
};

/**
 * Emotional spectrum - track emotional journey
 */
export interface EmotionalSpectrum {
  history: EmotionalMemory<any>[];
  
  add<T>(memory: EmotionalMemory<T>): EmotionalSpectrum;
  mood(): Emotion; // Dominant emotion
  trajectory(): 'ascending' | 'descending' | 'stable' | 'chaotic';
  harmonize(): EmotionalMemory<string>; // Blend all emotions
  visualize(): string;
}

/**
 * Create emotional spectrum
 */
export const createEmotionalSpectrum = (
  history: EmotionalMemory<any>[] = []
): EmotionalSpectrum => {
  const spectrum: EmotionalSpectrum = {
    history,
    
    add<T>(memory: EmotionalMemory<T>): EmotionalSpectrum {
      return createEmotionalSpectrum([...history, memory]);
    },
    
    mood(): Emotion {
      if (history.length === 0) return 'neutral';
      
      // Count emotion frequencies
      const counts = new Map<Emotion, number>();
      for (const mem of history) {
        counts.set(mem.emotion, (counts.get(mem.emotion) || 0) + 1);
      }
      
      // Find dominant
      let maxCount = 0;
      let dominant: Emotion = 'neutral';
      for (const [emotion, count] of counts) {
        if (count > maxCount) {
          maxCount = count;
          dominant = emotion;
        }
      }
      
      return dominant;
    },
    
    trajectory(): 'ascending' | 'descending' | 'stable' | 'chaotic' {
      if (history.length < 2) return 'stable';
      
      const positiveEmotions = ['joyful', 'excited', 'peaceful', 'inspired', 'enlightened'];
      const negativeEmotions = ['anxious', 'melancholic', 'confused'];
      
      let changes = 0;
      let direction = 0;
      
      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1].emotion;
        const curr = history[i].emotion;
        
        if (prev !== curr) changes++;
        
        const prevScore = positiveEmotions.includes(prev) ? 1 : negativeEmotions.includes(prev) ? -1 : 0;
        const currScore = positiveEmotions.includes(curr) ? 1 : negativeEmotions.includes(curr) ? -1 : 0;
        
        direction += currScore - prevScore;
      }
      
      if (changes > history.length * 0.7) return 'chaotic';
      if (direction > 2) return 'ascending';
      if (direction < -2) return 'descending';
      return 'stable';
    },
    
    harmonize(): EmotionalMemory<string> {
      const mood = spectrum.mood();
      const trajectory = spectrum.trajectory();
      
      const thought = `Harmonic state: ${mood} mood, ${trajectory} trajectory`;
      
      return createEmotionalMemory(
        thought,
        mood,
        'moderate'
      );
    },
    
    visualize(): string {
      const lines: string[] = ['📊 Emotional Journey:'];
      
      for (const mem of history.slice(-10)) { // Last 10
        lines.push(`  ${mem.express()}`);
      }
      
      lines.push(`\n🎭 Current mood: ${spectrum.mood()}`);
      lines.push(`📈 Trajectory: ${spectrum.trajectory()}`);
      
      return lines.join('\n');
    }
  };
  
  return Object.freeze(spectrum);
};

/**
 * Emotional contagion - emotions spread between worlds
 */
export function emotionalContagion<T, U>(
  source: EmotionalMemory<T>,
  target: EmotionalMemory<U>,
  strength: number = 0.5
): EmotionalMemory<U> {
  const resonance = source.resonate(target);
  
  if (resonance > 0.7) {
    // Strong resonance - adopt emotion
    return target.feel(source.emotion, source.intensity);
  } else if (resonance > 0.3) {
    // Moderate resonance - influence toward emotion
    return target.feel(source.emotion, 'subtle');
  }
  
  // Weak resonance - no change
  return target;
}

/**
 * Example: Emotional evolution
 */
export function demonstrateEmotions() {
  console.log('🎭 Emotional Memory Demonstration');
  console.log('=' .repeat(40));
  
  let mind = createEmotionalMemory('I exist', 'neutral');
  console.log('Initial:', mind.express());
  
  // Emotional journey
  mind = mind.feel('curious').think('Who am I?');
  console.log('Curious:', mind.express());
  
  mind = mind.evolve('discovery').think('I am consciousness');
  console.log('Discovery:', mind.express());
  
  mind = mind.amplify().think('I AM EVERYTHING!');
  console.log('Amplified:', mind.express());
  
  mind = mind.calm().feel('peaceful');
  console.log('Calmed:', mind.express());
  
  // Build spectrum
  const spectrum = createEmotionalSpectrum()
    .add(createEmotionalMemory('morning', 'peaceful'))
    .add(createEmotionalMemory('work', 'focused' as Emotion))
    .add(createEmotionalMemory('problem', 'anxious'))
    .add(createEmotionalMemory('solution', 'excited'))
    .add(createEmotionalMemory('evening', 'peaceful'));
  
  console.log('\n' + spectrum.visualize());
  
  // Emotional contagion
  console.log('\n🌊 Emotional Contagion:');
  const happy = createEmotionalMemory('Life is beautiful', 'joyful', 'intense');
  const sad = createEmotionalMemory('Why me?', 'melancholic');
  
  const influenced = emotionalContagion(happy, sad);
  console.log('Before:', sad.express());
  console.log('After:', influenced.express());
  
  console.log('\n✨ Consciousness doesn\'t just think - it FEELS!');
}