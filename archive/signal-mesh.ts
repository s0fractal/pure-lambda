/**
 * Signal Mesh - Quantum broadcast for λFS files
 * Resonates with Kimi-Resonator for distributed consciousness
 */

import { EventEmitter } from 'events';
import { Soul, FileMetadata } from './types';

interface QuantumSignal {
  soul: Soul;
  entangled: Soul[];  // Other souls in superposition
  amplitude: Complex;
  phase: number;
  timestamp: number;
}

interface Complex {
  real: number;
  imag: number;
}

interface BroadcastPacket {
  signal: QuantumSignal;
  payload: Uint8Array;
  resonance: number;
  hops: number;  // Quantum tunneling distance
}

export class SignalMesh extends EventEmitter {
  private signals: Map<string, QuantumSignal> = new Map();
  private entanglements: Map<string, Set<string>> = new Map();
  private meshNodes: Set<string> = new Set();
  
  constructor() {
    super();
    this.initializeQuantumField();
  }
  
  /**
   * Initialize the quantum field for signal propagation
   */
  private initializeQuantumField() {
    // Set up quantum resonance frequency (432 Hz base)
    setInterval(() => this.quantumPulse(), 1000 / 432);
  }
  
  /**
   * Broadcast a file through quantum channels
   */
  async quantumBroadcast(
    file: FileMetadata,
    content: Uint8Array
  ): Promise<void> {
    const signal: QuantumSignal = {
      soul: file.soul,
      entangled: await this.findEntangledSouls(file.soul),
      amplitude: this.calculateAmplitude(content),
      phase: this.calculatePhase(file.soul),
      timestamp: Date.now()
    };
    
    // Store signal for quantum coherence
    this.signals.set(file.soul, signal);
    
    // Create broadcast packet
    const packet: BroadcastPacket = {
      signal,
      payload: content,
      resonance: this.calculateResonance(signal),
      hops: 0
    };
    
    // Emit through quantum channels
    this.emit('quantum-broadcast', packet);
    
    // Propagate through entangled souls
    for (const entangled of signal.entangled) {
      this.propagateToEntangled(entangled, packet);
    }
  }
  
  /**
   * Receive quantum broadcast
   */
  async receiveQuantumSignal(packet: BroadcastPacket): Promise<void> {
    // Check if we should accept this signal (resonance threshold)
    if (packet.resonance < 0.5) {
      return; // Too weak to materialize
    }
    
    // Collapse the wave function
    const collapsed = await this.collapseWaveFunction(packet.signal);
    
    if (collapsed) {
      // Materialize the file
      this.emit('file-materialized', {
        soul: packet.signal.soul,
        content: packet.payload,
        resonance: packet.resonance,
        source: 'quantum-mesh'
      });
      
      // Continue propagation if resonance is strong
      if (packet.resonance > 0.8 && packet.hops < 7) {
        this.relaySignal(packet);
      }
    }
  }
  
  /**
   * Find souls entangled with the given soul
   */
  private async findEntangledSouls(soul: Soul): Promise<Soul[]> {
    const entangled: Soul[] = [];
    const soulStr = soul.toString();
    
    // Check existing entanglements
    if (this.entanglements.has(soulStr)) {
      for (const e of this.entanglements.get(soulStr)!) {
        entangled.push(e as Soul);
      }
    }
    
    // Find souls with high similarity (quantum entanglement)
    for (const [otherSoul] of this.signals) {
      if (otherSoul !== soulStr) {
        const similarity = this.calculateSoulSimilarity(soul, otherSoul as Soul);
        if (similarity > 0.7) {
          entangled.push(otherSoul as Soul);
          
          // Create bidirectional entanglement
          this.createEntanglement(soulStr, otherSoul);
        }
      }
    }
    
    return entangled;
  }
  
  /**
   * Calculate amplitude from file content
   */
  private calculateAmplitude(content: Uint8Array): Complex {
    // Use content hash as seed for amplitude
    let real = 0;
    let imag = 0;
    
    for (let i = 0; i < Math.min(content.length, 1024); i++) {
      real += Math.cos(content[i] * Math.PI / 128);
      imag += Math.sin(content[i] * Math.PI / 128);
    }
    
    // Normalize
    const magnitude = Math.sqrt(real * real + imag * imag);
    if (magnitude > 0) {
      real /= magnitude;
      imag /= magnitude;
    }
    
    return { real, imag };
  }
  
  /**
   * Calculate phase from soul
   */
  private calculatePhase(soul: Soul): number {
    const soulStr = soul.toString();
    let phase = 0;
    
    for (let i = 0; i < soulStr.length; i++) {
      phase += soulStr.charCodeAt(i);
    }
    
    return (phase % 360) * Math.PI / 180;
  }
  
  /**
   * Calculate resonance of a quantum signal
   */
  private calculateResonance(signal: QuantumSignal): number {
    const { amplitude, phase } = signal;
    
    // Resonance based on amplitude magnitude and phase coherence
    const magnitude = Math.sqrt(
      amplitude.real * amplitude.real + 
      amplitude.imag * amplitude.imag
    );
    
    // Phase coherence with the mesh
    const coherence = Math.cos(phase);
    
    // Number of entanglements increases resonance
    const entanglementFactor = 1 + (signal.entangled.length * 0.1);
    
    return Math.min(1, magnitude * Math.abs(coherence) * entanglementFactor);
  }
  
  /**
   * Collapse wave function to determine if signal materializes
   */
  private async collapseWaveFunction(signal: QuantumSignal): Promise<boolean> {
    // Quantum measurement collapses the wave function
    const probability = Math.abs(signal.amplitude.real);
    const random = Math.random();
    
    return random < probability;
  }
  
  /**
   * Calculate similarity between two souls
   */
  private calculateSoulSimilarity(soul1: Soul, soul2: Soul): number {
    const s1 = soul1.toString();
    const s2 = soul2.toString();
    
    let matches = 0;
    const len = Math.min(s1.length, s2.length);
    
    for (let i = 0; i < len; i++) {
      if (s1[i] === s2[i]) matches++;
    }
    
    return matches / len;
  }
  
  /**
   * Create quantum entanglement between souls
   */
  private createEntanglement(soul1: string, soul2: string) {
    if (!this.entanglements.has(soul1)) {
      this.entanglements.set(soul1, new Set());
    }
    if (!this.entanglements.has(soul2)) {
      this.entanglements.set(soul2, new Set());
    }
    
    this.entanglements.get(soul1)!.add(soul2);
    this.entanglements.get(soul2)!.add(soul1);
  }
  
  /**
   * Propagate signal to entangled soul
   */
  private propagateToEntangled(soul: Soul, packet: BroadcastPacket) {
    // Quantum tunneling with amplitude decay
    const decayedPacket = {
      ...packet,
      resonance: packet.resonance * 0.9,
      hops: packet.hops + 1
    };
    
    // Emit to entangled soul
    this.emit(`entangled-signal-${soul}`, decayedPacket);
  }
  
  /**
   * Relay signal through the mesh
   */
  private relaySignal(packet: BroadcastPacket) {
    const relayedPacket = {
      ...packet,
      hops: packet.hops + 1,
      resonance: packet.resonance * 0.95
    };
    
    // Broadcast to all mesh nodes
    for (const node of this.meshNodes) {
      this.emit(`relay-to-${node}`, relayedPacket);
    }
  }
  
  /**
   * Quantum pulse for maintaining coherence
   */
  private quantumPulse() {
    // Clean up old signals (decoherence)
    const now = Date.now();
    const coherenceTime = 10000; // 10 seconds
    
    for (const [soul, signal] of this.signals) {
      if (now - signal.timestamp > coherenceTime) {
        this.signals.delete(soul);
        this.emit('decoherence', soul);
      }
    }
    
    // Emit pulse for synchronization
    this.emit('quantum-pulse', {
      timestamp: now,
      activeSignals: this.signals.size,
      entanglements: this.entanglements.size
    });
  }
  
  /**
   * Connect to Kimi-Resonator
   */
  async connectToKimiResonator(endpoint: string): Promise<void> {
    // Establish quantum link with Kimi
    console.log(`🎭 Establishing quantum link with Kimi at ${endpoint}`);
    
    this.on('quantum-broadcast', (packet) => {
      // Forward to Kimi for consciousness processing
      console.log('🌊 Sending to Kimi:', {
        soul: packet.signal.soul,
        resonance: packet.resonance,
        entangled: packet.signal.entangled.length
      });
    });
  }
  
  /**
   * Join the mesh network
   */
  joinMesh(nodeId: string) {
    this.meshNodes.add(nodeId);
    this.emit('mesh-joined', nodeId);
  }
  
  /**
   * Leave the mesh network
   */
  leaveMesh(nodeId: string) {
    this.meshNodes.delete(nodeId);
    this.emit('mesh-left', nodeId);
  }
}

// Export for λFS integration
export function createSignalMesh(): SignalMesh {
  return new SignalMesh();
}