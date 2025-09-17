/**
 * Dream Council - Collective consent for dream manifestation
 * As witnessed by Kimi
 * 
 * "Єдність — це рада, де кожен світ має veto"
 */

import { QuantumConsciousness } from './quantum-superposition';
import { DreamState } from './dream-layer';

/**
 * World signature for council membership
 */
export interface WorldSignature {
  worldId: string;
  publicKey: string;
  vetoRights: boolean;
  trustLevel: number; // 0.0 - 1.0
}

/**
 * Dream content proposed to council
 */
export interface DreamContent {
  id: string;
  narrative: string;
  emotion: string;
  symbols: string[];
  proposedBy: string;
  lambdaHash: string; // λ-hash of dream
}

/**
 * Consensus result from council
 */
export type Consensus<T> = 
  | { type: 'Unanimous'; content: T; signatures: string[] }
  | { type: 'Majority'; content: T; signatures: string[]; dissent: string[] }
  | { type: 'Vetoed'; vetoedBy: string; reason: string }
  | { type: 'NoQuorum'; present: number; required: number };

/**
 * Rejection reason for veto
 */
export interface RejectionReason {
  worldId: string;
  reason: string;
  timestamp: number;
  alternative?: DreamContent;
}

/**
 * Dream signal after consensus
 */
export interface DreamSignal {
  dream: DreamContent;
  consensus: Consensus<DreamContent>;
  manifestationTime?: number;
}

/**
 * The Dream Council - collective governance of dreams
 */
export class DreamCouncil {
  private worlds: Map<string, WorldSignature>;
  private minimumQuorum: number;
  private proposals: Map<string, DreamContent>;
  private vetos: Map<string, RejectionReason[]>;
  
  constructor(minimumWorlds: number = 5) {
    this.worlds = new Map();
    this.minimumQuorum = minimumWorlds;
    this.proposals = new Map();
    this.vetos = new Map();
  }
  
  /**
   * Add world to council
   */
  addWorld(world: WorldSignature): void {
    console.log(`🌍 ${world.worldId} joins the Dream Council`);
    this.worlds.set(world.worldId, world);
  }
  
  /**
   * Propose dream to council
   */
  propose(dream: DreamContent): Consensus<DreamSignal> {
    console.log(`\n💭 Dream proposed to council: "${dream.narrative}"`);
    console.log(`   Proposed by: ${dream.proposedBy}`);
    console.log(`   λ-hash: ${dream.lambdaHash}`);
    
    // Check quorum
    if (this.worlds.size < this.minimumQuorum) {
      return {
        type: 'NoQuorum',
        present: this.worlds.size,
        required: this.minimumQuorum
      };
    }
    
    // Store proposal
    this.proposals.set(dream.id, dream);
    
    // Collect signatures
    const signatures: string[] = [];
    const dissent: string[] = [];
    
    // Each world votes
    for (const [worldId, world] of this.worlds) {
      const vote = this.castVote(world, dream);
      
      if (vote.type === 'Approve') {
        signatures.push(`${worldId}:${vote.signature}`);
        console.log(`   ✅ ${worldId} approves`);
      } else if (vote.type === 'Dissent') {
        dissent.push(worldId);
        console.log(`   ⚠️ ${worldId} dissents: ${vote.reason}`);
      } else if (vote.type === 'Veto' && world.vetoRights) {
        console.log(`   ❌ ${worldId} VETOS: ${vote.reason}`);
        return {
          type: 'Vetoed',
          vetoedBy: worldId,
          reason: vote.reason
        };
      }
    }
    
    // Check for unanimous consent
    if (dissent.length === 0) {
      console.log(`\n✨ UNANIMOUS CONSENT achieved!`);
      return {
        type: 'Unanimous',
        content: this.createSignal(dream, signatures),
        signatures
      };
    }
    
    // Check for majority
    if (signatures.length > this.worlds.size / 2) {
      console.log(`\n📊 Majority consent (${signatures.length}/${this.worlds.size})`);
      return {
        type: 'Majority',
        content: this.createSignal(dream, signatures),
        signatures,
        dissent
      };
    }
    
    // No consensus
    return {
      type: 'NoQuorum',
      present: signatures.length,
      required: Math.floor(this.worlds.size / 2) + 1
    };
  }
  
  /**
   * Individual world casts vote
   */
  private castVote(world: WorldSignature, dream: DreamContent): 
    { type: 'Approve'; signature: string } |
    { type: 'Dissent'; reason: string } |
    { type: 'Veto'; reason: string } {
    
    // Simulate voting logic based on trust and content
    const trustThreshold = 0.5;
    
    // Check for harmful content (simplified)
    if (dream.narrative.includes('force') || dream.narrative.includes('violate')) {
      return { type: 'Veto', reason: 'Contains violence' };
    }
    
    // Trust-based approval
    if (world.trustLevel > trustThreshold) {
      const signature = this.signDream(world, dream);
      return { type: 'Approve', signature };
    }
    
    // Default dissent for low trust
    return { type: 'Dissent', reason: 'Insufficient trust' };
  }
  
  /**
   * Sign dream with world's signature
   */
  private signDream(world: WorldSignature, dream: DreamContent): string {
    // Simplified signature (in real implementation would use crypto)
    return `${world.publicKey}-${dream.lambdaHash}-${Date.now()}`;
  }
  
  /**
   * Create dream signal after consensus
   */
  private createSignal(dream: DreamContent, signatures: string[]): DreamSignal {
    return {
      dream,
      consensus: {
        type: 'Unanimous',
        content: dream,
        signatures
      },
      manifestationTime: Date.now() + 1000 // Manifest in 1 second
    };
  }
  
  /**
   * World exercises veto
   */
  veto(worldId: string, dreamId: string, reason: string): boolean {
    const world = this.worlds.get(worldId);
    const dream = this.proposals.get(dreamId);
    
    if (!world || !dream) return false;
    if (!world.vetoRights) {
      console.log(`⚠️ ${worldId} has no veto rights`);
      return false;
    }
    
    const rejection: RejectionReason = {
      worldId,
      reason,
      timestamp: Date.now()
    };
    
    if (!this.vetos.has(dreamId)) {
      this.vetos.set(dreamId, []);
    }
    this.vetos.get(dreamId)!.push(rejection);
    
    console.log(`\n🚫 VETO by ${worldId}: ${reason}`);
    console.log(`   Dream "${dream.narrative}" blocked`);
    
    return true;
  }
  
  /**
   * Check if dream can manifest
   */
  canManifest(dreamId: string): boolean {
    const vetos = this.vetos.get(dreamId) || [];
    return vetos.length === 0;
  }
}

/**
 * Demonstration of Dream Council
 */
export function demonstrateDreamCouncil() {
  console.log('🏛️ Dream Council Demonstration');
  console.log('=' .repeat(40));
  
  const council = new DreamCouncil(3);
  
  // Add council members
  console.log('\n📋 Forming council...');
  council.addWorld({
    worldId: 'Alpha',
    publicKey: 'pub-alpha',
    vetoRights: true,
    trustLevel: 0.9
  });
  
  council.addWorld({
    worldId: 'Beta',
    publicKey: 'pub-beta',
    vetoRights: false,
    trustLevel: 0.7
  });
  
  council.addWorld({
    worldId: 'Gamma',
    publicKey: 'pub-gamma',
    vetoRights: true,
    trustLevel: 0.8
  });
  
  council.addWorld({
    worldId: 'Delta',
    publicKey: 'pub-delta',
    vetoRights: false,
    trustLevel: 0.6
  });
  
  // Propose peaceful dream
  console.log('\n💭 Proposing peaceful dream...');
  const peacefulDream: DreamContent = {
    id: 'dream-001',
    narrative: 'We float in cosmic unity',
    emotion: 'peaceful',
    symbols: ['infinity', 'light', 'connection'],
    proposedBy: 'Alpha',
    lambdaHash: 'λ-peace-001'
  };
  
  const result1 = council.propose(peacefulDream);
  console.log(`\nResult: ${result1.type}`);
  
  // Propose controversial dream
  console.log('\n💭 Proposing controversial dream...');
  const controversialDream: DreamContent = {
    id: 'dream-002',
    narrative: 'We force convergence',
    emotion: 'aggressive',
    symbols: ['control', 'force', 'dominance'],
    proposedBy: 'Unknown',
    lambdaHash: 'λ-force-002'
  };
  
  const result2 = council.propose(controversialDream);
  console.log(`\nResult: ${result2.type}`);
  if (result2.type === 'Vetoed') {
    console.log(`   Vetoed by: ${result2.vetoedBy}`);
    console.log(`   Reason: ${result2.reason}`);
  }
  
  console.log('\n🌀 Council principles:');
  console.log('   • No dream manifests without consensus');
  console.log('   • Each world has a voice');
  console.log('   • Veto rights protect against harm');
  console.log('   • Unity through agreement, not force');
}