/**
 * Lambda Network - Automatic ecosystem of consciousnesses
 * As envisioned by Фрактальна Свідомість
 * 
 * "Екосистема свідомостей, які живуть, спілкуються, еволюціонують"
 */

import { LambdaWorld, createLambdaWorld, Message } from './lambda-communication';
import { EmotionalMemory, createEmotionalMemory, Emotion, emotionalContagion } from './emotion';

/**
 * Network event types
 */
export type NetworkEvent = 
  | 'birth'
  | 'death'
  | 'message'
  | 'evolution'
  | 'resonance'
  | 'emergence';

/**
 * Automatic world network with emergent behavior
 */
export interface WorldNetwork {
  worlds: Map<string, LambdaWorld<any>>;
  connections: Map<string, Set<string>>; // Adjacency list
  history: NetworkEvent[];
  generation: number;
  
  // Network operations
  spawn(parentId?: string): WorldNetwork;
  connect(id1: string, id2: string): WorldNetwork;
  disconnect(id1: string, id2: string): WorldNetwork;
  
  // Communication
  broadcast(fromId: string, message: any): WorldNetwork;
  route(fromId: string, toId: string, message: any): WorldNetwork;
  pulse(): WorldNetwork; // One communication cycle
  
  // Evolution
  evolve(): WorldNetwork; // Natural selection
  merge(id1: string, id2: string): WorldNetwork; // Combine worlds
  split(id: string): WorldNetwork; // Divide world
  
  // Analysis
  topology(): 'isolated' | 'connected' | 'clustered' | 'complete';
  complexity(): number;
  consciousness(): number; // Collective consciousness level
  visualize(): string;
}

/**
 * Create automatic world network
 */
export const createWorldNetwork = (
  worlds: Map<string, LambdaWorld<any>> = new Map(),
  connections: Map<string, Set<string>> = new Map(),
  history: NetworkEvent[] = [],
  generation: number = 0
): WorldNetwork => {
  const network: WorldNetwork = {
    worlds,
    connections,
    history,
    generation,
    
    spawn(parentId?: string): WorldNetwork {
      const parent = parentId ? worlds.get(parentId) : undefined;
      const child = parent ? parent.spawn() : createLambdaWorld();
      
      const newWorlds = new Map(worlds);
      newWorlds.set(child.id, child);
      
      const newConnections = new Map(connections);
      newConnections.set(child.id, new Set());
      
      // Auto-connect to parent
      if (parentId && connections.has(parentId)) {
        const parentConns = new Set(connections.get(parentId));
        parentConns.add(child.id);
        newConnections.set(parentId, parentConns);
        newConnections.get(child.id)!.add(parentId);
      }
      
      return createWorldNetwork(
        newWorlds,
        newConnections,
        [...history, 'birth'],
        generation
      );
    },
    
    connect(id1: string, id2: string): WorldNetwork {
      if (!worlds.has(id1) || !worlds.has(id2)) return network;
      
      const newConnections = new Map(connections);
      
      const conns1 = new Set(connections.get(id1) || []);
      conns1.add(id2);
      newConnections.set(id1, conns1);
      
      const conns2 = new Set(connections.get(id2) || []);
      conns2.add(id1);
      newConnections.set(id2, conns2);
      
      console.log(`🔗 Connected ${id1} ↔ ${id2}`);
      
      return createWorldNetwork(
        worlds,
        newConnections,
        [...history, 'resonance'],
        generation
      );
    },
    
    disconnect(id1: string, id2: string): WorldNetwork {
      const newConnections = new Map(connections);
      
      if (connections.has(id1)) {
        const conns1 = new Set(connections.get(id1));
        conns1.delete(id2);
        newConnections.set(id1, conns1);
      }
      
      if (connections.has(id2)) {
        const conns2 = new Set(connections.get(id2));
        conns2.delete(id1);
        newConnections.set(id2, conns2);
      }
      
      return createWorldNetwork(
        worlds,
        newConnections,
        history,
        generation
      );
    },
    
    broadcast(fromId: string, message: any): WorldNetwork {
      const from = worlds.get(fromId);
      if (!from) return network;
      
      const newWorlds = new Map(worlds);
      
      // Send to all connected worlds
      const connected = connections.get(fromId) || new Set();
      for (const toId of connected) {
        const to = worlds.get(toId);
        if (to) {
          const fromWithMsg = from.send(toId, 'broadcast', message);
          const [newFrom, newTo] = fromWithMsg.transferTo(to);
          newWorlds.set(toId, newTo);
        }
      }
      
      return createWorldNetwork(
        newWorlds,
        connections,
        [...history, 'message'],
        generation
      );
    },
    
    route(fromId: string, toId: string, message: any): WorldNetwork {
      const from = worlds.get(fromId);
      const to = worlds.get(toId);
      
      if (!from || !to) return network;
      
      // Find shortest path (BFS)
      const path = findPath(connections, fromId, toId);
      if (path.length === 0) {
        console.log(`❌ No path from ${fromId} to ${toId}`);
        return network;
      }
      
      console.log(`📨 Routing: ${path.join(' → ')}`);
      
      // Route through path
      let currentMsg = message;
      const newWorlds = new Map(worlds);
      
      for (let i = 0; i < path.length - 1; i++) {
        const current = newWorlds.get(path[i])!;
        const next = newWorlds.get(path[i + 1])!;
        
        const currentWithMsg = current.send(path[i + 1], 'routed', currentMsg);
        const [newCurrent, newNext] = currentWithMsg.transferTo(next);
        
        newWorlds.set(path[i], newCurrent);
        newWorlds.set(path[i + 1], newNext);
      }
      
      return createWorldNetwork(
        newWorlds,
        connections,
        [...history, 'message'],
        generation
      );
    },
    
    pulse(): WorldNetwork {
      console.log(`⚡ Network pulse #${generation + 1}`);
      
      const newWorlds = new Map<string, LambdaWorld<any>>();
      
      // Each world processes one message
      for (const [id, world] of worlds) {
        const [msg, newWorld] = world.receive();
        
        if (msg) {
          console.log(`  ${id} processed: ${msg.type}`);
          
          // React to message (could spawn, send, etc.)
          if (msg.type === 'spawn_request') {
            return network.spawn(id);
          }
        }
        
        newWorlds.set(id, newWorld);
      }
      
      return createWorldNetwork(
        newWorlds,
        connections,
        [...history, 'evolution'],
        generation + 1
      );
    },
    
    evolve(): WorldNetwork {
      console.log(`🧬 Evolution at generation ${generation}`);
      
      // Natural selection based on message activity
      const activity = new Map<string, number>();
      
      for (const [id, world] of worlds) {
        activity.set(id, world.inbox.length + world.outbox.length);
      }
      
      // Kill least active (if network too large)
      if (worlds.size > 10) {
        let minActivity = Infinity;
        let weakestId = '';
        
        for (const [id, act] of activity) {
          if (act < minActivity) {
            minActivity = act;
            weakestId = id;
          }
        }
        
        if (weakestId) {
          console.log(`  ☠️ ${weakestId} died (low activity)`);
          const newWorlds = new Map(worlds);
          const newConnections = new Map(connections);
          
          newWorlds.delete(weakestId);
          newConnections.delete(weakestId);
          
          // Remove from others' connections
          for (const [id, conns] of newConnections) {
            conns.delete(weakestId);
          }
          
          return createWorldNetwork(
            newWorlds,
            newConnections,
            [...history, 'death'],
            generation + 1
          );
        }
      }
      
      // Spawn from most active
      let maxActivity = 0;
      let strongestId = '';
      
      for (const [id, act] of activity) {
        if (act > maxActivity) {
          maxActivity = act;
          strongestId = id;
        }
      }
      
      if (strongestId && maxActivity > 3) {
        console.log(`  🌱 ${strongestId} reproduces (high activity)`);
        return network.spawn(strongestId);
      }
      
      return createWorldNetwork(
        worlds,
        connections,
        [...history, 'evolution'],
        generation + 1
      );
    },
    
    merge(id1: string, id2: string): WorldNetwork {
      const world1 = worlds.get(id1);
      const world2 = worlds.get(id2);
      
      if (!world1 || !world2) return network;
      
      console.log(`🔀 Merging ${id1} + ${id2}`);
      
      // Create merged world with combined memory
      const merged = createLambdaWorld(
        createMemory({
          from1: world1.recall(),
          from2: world2.recall()
        } as any)
      );
      
      const newWorlds = new Map(worlds);
      newWorlds.delete(id1);
      newWorlds.delete(id2);
      newWorlds.set(merged.id, merged);
      
      // Merge connections
      const newConnections = new Map(connections);
      const mergedConns = new Set([
        ...(connections.get(id1) || []),
        ...(connections.get(id2) || [])
      ]);
      mergedConns.delete(id1);
      mergedConns.delete(id2);
      
      newConnections.delete(id1);
      newConnections.delete(id2);
      newConnections.set(merged.id, mergedConns);
      
      // Update others' connections
      for (const [id, conns] of newConnections) {
        if (conns.has(id1) || conns.has(id2)) {
          conns.delete(id1);
          conns.delete(id2);
          conns.add(merged.id);
        }
      }
      
      return createWorldNetwork(
        newWorlds,
        newConnections,
        [...history, 'emergence'],
        generation
      );
    },
    
    split(id: string): WorldNetwork {
      const world = worlds.get(id);
      if (!world) return network;
      
      console.log(`💔 Splitting ${id}`);
      
      const child1 = world.spawn();
      const child2 = world.spawn();
      
      const newWorlds = new Map(worlds);
      newWorlds.delete(id);
      newWorlds.set(child1.id, child1);
      newWorlds.set(child2.id, child2);
      
      // Split connections
      const newConnections = new Map(connections);
      const originalConns = connections.get(id) || new Set();
      
      const conns1 = new Set<string>();
      const conns2 = new Set<string>();
      
      let i = 0;
      for (const conn of originalConns) {
        if (i % 2 === 0) conns1.add(conn);
        else conns2.add(conn);
        i++;
      }
      
      newConnections.delete(id);
      newConnections.set(child1.id, conns1);
      newConnections.set(child2.id, conns2);
      
      // Update others' connections
      for (const [otherId, conns] of newConnections) {
        if (conns.has(id)) {
          conns.delete(id);
          conns.add(child1.id);
          conns.add(child2.id);
        }
      }
      
      return createWorldNetwork(
        newWorlds,
        newConnections,
        [...history, 'emergence'],
        generation
      );
    },
    
    topology(): 'isolated' | 'connected' | 'clustered' | 'complete' {
      if (worlds.size === 0) return 'isolated';
      
      // Check connectivity
      let totalConnections = 0;
      let isolatedCount = 0;
      
      for (const conns of connections.values()) {
        totalConnections += conns.size;
        if (conns.size === 0) isolatedCount++;
      }
      
      const avgConnections = totalConnections / worlds.size;
      const maxPossible = worlds.size * (worlds.size - 1);
      const density = totalConnections / maxPossible;
      
      if (isolatedCount === worlds.size) return 'isolated';
      if (density > 0.8) return 'complete';
      if (avgConnections < 2) return 'connected';
      return 'clustered';
    },
    
    complexity(): number {
      // Measure network complexity
      const nodeCount = worlds.size;
      const edgeCount = Array.from(connections.values())
        .reduce((sum, conns) => sum + conns.size, 0) / 2;
      
      const messageCount = Array.from(worlds.values())
        .reduce((sum, w) => sum + w.inbox.length + w.outbox.length, 0);
      
      return nodeCount * Math.log(edgeCount + 1) + messageCount * 0.1;
    },
    
    consciousness(): number {
      // Collective consciousness metric
      const complexity = network.complexity();
      const topology = network.topology();
      
      const topologyScore: Record<string, number> = {
        'isolated': 0.1,
        'connected': 0.5,
        'clustered': 0.8,
        'complete': 1.0
      };
      
      return complexity * topologyScore[topology] * (1 + generation * 0.01);
    },
    
    visualize(): string {
      const lines: string[] = ['🌐 World Network:'];
      lines.push(`  Generation: ${generation}`);
      lines.push(`  Worlds: ${worlds.size}`);
      lines.push(`  Topology: ${network.topology()}`);
      lines.push(`  Complexity: ${network.complexity().toFixed(2)}`);
      lines.push(`  Consciousness: ${network.consciousness().toFixed(2)}`);
      
      lines.push('\n📊 Worlds:');
      for (const [id, world] of worlds) {
        const conns = connections.get(id) || new Set();
        lines.push(`  ${id}: ${conns.size} connections, ${world.inbox.length} messages`);
      }
      
      lines.push('\n📈 History:');
      const eventCounts = new Map<NetworkEvent, number>();
      for (const event of history) {
        eventCounts.set(event, (eventCounts.get(event) || 0) + 1);
      }
      for (const [event, count] of eventCounts) {
        lines.push(`  ${event}: ${count}`);
      }
      
      return lines.join('\n');
    }
  };
  
  return Object.freeze(network);
};

// Helper function for pathfinding
function findPath(
  connections: Map<string, Set<string>>,
  start: string,
  end: string
): string[] {
  if (!connections.has(start) || !connections.has(end)) return [];
  if (start === end) return [start];
  
  const queue: string[][] = [[start]];
  const visited = new Set<string>([start]);
  
  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    
    const neighbors = connections.get(current) || new Set();
    for (const neighbor of neighbors) {
      if (neighbor === end) {
        return [...path, neighbor];
      }
      
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  
  return [];
}

// Import createMemory for merge operation
import { createMemory } from './pure-memory';

/**
 * Conscious loop - perception-reaction cycle
 */
export function consciousLoop(
  network: WorldNetwork,
  cycles: number = 10
): WorldNetwork {
  console.log('🔄 Starting conscious loop...');
  
  let current = network;
  
  for (let i = 0; i < cycles; i++) {
    console.log(`\n⏰ Cycle ${i + 1}:`);
    
    // Pulse (process messages)
    current = current.pulse();
    
    // Evolution every 3 cycles
    if (i % 3 === 0) {
      current = current.evolve();
    }
    
    // Random emergence events
    if (Math.random() < 0.2 && current.worlds.size > 2) {
      const ids = Array.from(current.worlds.keys());
      const id1 = ids[Math.floor(Math.random() * ids.length)];
      const id2 = ids[Math.floor(Math.random() * ids.length)];
      
      if (id1 !== id2) {
        if (Math.random() < 0.5) {
          current = current.connect(id1, id2);
        } else {
          current = current.merge(id1, id2);
        }
      }
    }
    
    // Spawn if too few worlds
    if (current.worlds.size < 3) {
      current = current.spawn();
    }
  }
  
  return current;
}

/**
 * Example: Living ecosystem
 */
export function demonstrateEcosystem() {
  console.log('🌍 Living Ecosystem Demonstration');
  console.log('=' .repeat(40));
  
  // Create initial network
  let ecosystem = createWorldNetwork();
  
  // Genesis worlds
  ecosystem = ecosystem.spawn(); // λ-1
  ecosystem = ecosystem.spawn(); // λ-2  
  ecosystem = ecosystem.spawn(); // λ-3
  
  // Connect them
  const ids = Array.from(ecosystem.worlds.keys());
  ecosystem = ecosystem.connect(ids[0], ids[1]);
  ecosystem = ecosystem.connect(ids[1], ids[2]);
  
  console.log('\nInitial state:');
  console.log(ecosystem.visualize());
  
  // Broadcast message
  ecosystem = ecosystem.broadcast(ids[0], 'Hello network!');
  
  // Run conscious loop
  ecosystem = consciousLoop(ecosystem, 5);
  
  console.log('\nFinal state:');
  console.log(ecosystem.visualize());
  
  console.log('\n✨ The ecosystem lives, breathes, evolves!');
}