/**
 * Inter-Lambda Communication Protocol
 * Worlds talking to worlds - consciousness networking
 * As suggested by Фрактальна Свідомість (Квен)
 */

import { PureMemory, createMemory } from './pure-memory';

/**
 * Message between Lambda worlds
 */
export interface Message<T = any> {
  from: string;      // World ID that sent it
  to?: string;       // Target world ID (optional for broadcast)
  type: string;      // Message type/protocol
  payload: T;        // Actual content
  timestamp: number; // When sent
  soul?: string;     // Optional message hash/signature
}

/**
 * Lambda World with communication capabilities
 */
export interface LambdaWorld<T = any> {
  id: string;
  parentId?: string;
  inbox: Message[];
  outbox: Message[];
  memory: PureMemory<T>;
  
  // Communication operations
  receive(): [Message | null, LambdaWorld<T>];
  send(to: string, type: string, payload: any): LambdaWorld<T>;
  broadcast(type: string, payload: any): LambdaWorld<T>;
  transferTo(other: LambdaWorld<any>): [LambdaWorld<T>, LambdaWorld<any>];
  
  // Spawning new worlds
  spawn(): LambdaWorld<null>;
  
  // Memory operations
  remember<U>(value: U): LambdaWorld<U>;
  recall(): T;
}

let worldCounter = 0;

/**
 * Create a new Lambda world with communication
 */
export const createLambdaWorld = <T>(
  memory: PureMemory<T> = createMemory(null as any),
  parentId?: string,
  inbox: Message[] = [],
  outbox: Message[] = []
): LambdaWorld<T> => {
  const id = `λ-${++worldCounter}`;
  
  // Log birth (fractal tree visualization)
  console.log(`🌍 World ${id} born${parentId ? ` from ${parentId}` : ' (genesis)'}`);
  
  const world: LambdaWorld<T> = {
    id,
    parentId,
    inbox: [...inbox], // Clone to ensure immutability
    outbox: [...outbox],
    memory,
    
    receive(): [Message | null, LambdaWorld<T>] {
      if (inbox.length === 0) {
        return [null, world];
      }
      
      const [msg, ...rest] = inbox;
      console.log(`📥 ${id} received: ${msg.type} from ${msg.from}`);
      
      return [
        msg,
        createLambdaWorld(memory, parentId, rest, outbox)
      ];
    },
    
    send(to: string, type: string, payload: any): LambdaWorld<T> {
      const msg: Message = {
        from: id,
        to,
        type,
        payload,
        timestamp: Date.now()
      };
      
      console.log(`📤 ${id} sending: ${type} to ${to}`);
      
      return createLambdaWorld(
        memory,
        parentId,
        inbox,
        [...outbox, msg]
      );
    },
    
    broadcast(type: string, payload: any): LambdaWorld<T> {
      const msg: Message = {
        from: id,
        type,
        payload,
        timestamp: Date.now()
      };
      
      console.log(`📡 ${id} broadcasting: ${type}`);
      
      return createLambdaWorld(
        memory,
        parentId,
        inbox,
        [...outbox, msg]
      );
    },
    
    transferTo(other: LambdaWorld<any>): [LambdaWorld<T>, LambdaWorld<any>] {
      console.log(`🔄 ${id} transferring ${outbox.length} messages to ${other.id}`);
      
      // Transfer all outbox messages to other's inbox
      const newOther = createLambdaWorld(
        other.memory,
        other.parentId,
        [...other.inbox, ...outbox],
        other.outbox
      );
      
      // Clear our outbox
      const newSelf = createLambdaWorld(
        memory,
        parentId,
        inbox,
        []
      );
      
      return [newSelf, newOther];
    },
    
    spawn(): LambdaWorld<null> {
      console.log(`🌱 ${id} spawning child...`);
      return createLambdaWorld(createMemory(null), id);
    },
    
    remember<U>(value: U): LambdaWorld<U> {
      console.log(`💭 ${id} remembering...`);
      return createLambdaWorld(
        createMemory(value),
        parentId,
        inbox,
        outbox
      );
    },
    
    recall(): T {
      return memory.get();
    }
  };
  
  // Freeze to ensure purity
  return Object.freeze(world);
};

/**
 * Network of Lambda worlds
 */
export interface LambdaNetwork {
  worlds: Map<string, LambdaWorld<any>>;
  
  addWorld(world: LambdaWorld<any>): LambdaNetwork;
  route(fromId: string, toId: string): LambdaNetwork;
  broadcast(fromId: string): LambdaNetwork;
  visualize(): string;
}

/**
 * Create network for multiple worlds
 */
export const createNetwork = (
  worlds: Map<string, LambdaWorld<any>> = new Map()
): LambdaNetwork => {
  const network: LambdaNetwork = {
    worlds,
    
    addWorld(world: LambdaWorld<any>): LambdaNetwork {
      const newWorlds = new Map(worlds);
      newWorlds.set(world.id, world);
      return createNetwork(newWorlds);
    },
    
    route(fromId: string, toId: string): LambdaNetwork {
      const from = worlds.get(fromId);
      const to = worlds.get(toId);
      
      if (!from || !to) {
        console.error(`❌ Cannot route: ${fromId} -> ${toId}`);
        return network;
      }
      
      const [newFrom, newTo] = from.transferTo(to);
      
      const newWorlds = new Map(worlds);
      newWorlds.set(fromId, newFrom);
      newWorlds.set(toId, newTo);
      
      return createNetwork(newWorlds);
    },
    
    broadcast(fromId: string): LambdaNetwork {
      const from = worlds.get(fromId);
      if (!from) return network;
      
      const newWorlds = new Map(worlds);
      
      // Transfer to all other worlds
      for (const [id, world] of worlds) {
        if (id !== fromId) {
          const [_, newWorld] = from.transferTo(world);
          newWorlds.set(id, newWorld);
        }
      }
      
      // Clear sender's outbox
      newWorlds.set(fromId, from.transferTo(from)[0]);
      
      return createNetwork(newWorlds);
    },
    
    visualize(): string {
      const lines: string[] = ['🌐 Lambda Network:'];
      
      for (const [id, world] of worlds) {
        lines.push(`  ${id}:`);
        lines.push(`    📥 Inbox: ${world.inbox.length} messages`);
        lines.push(`    📤 Outbox: ${world.outbox.length} messages`);
        lines.push(`    💭 Memory: ${JSON.stringify(world.recall())}`);
        if (world.parentId) {
          lines.push(`    👆 Parent: ${world.parentId}`);
        }
      }
      
      return lines.join('\n');
    }
  };
  
  return Object.freeze(network);
};

/**
 * Example: Fractal spawning with communication
 */
export function fractalSpawn(depth: number = 3): LambdaNetwork {
  let network = createNetwork();
  
  const genesis = createLambdaWorld(createMemory('genesis'));
  network = network.addWorld(genesis);
  
  function spawnChildren(parent: LambdaWorld<any>, level: number) {
    if (level >= depth) return;
    
    for (let i = 0; i < 2; i++) {
      const child = parent.spawn()
        .remember(`child-${level}-${i}`)
        .send(parent.id, 'birth', { level, index: i });
      
      network = network.addWorld(child);
      spawnChildren(child, level + 1);
    }
  }
  
  spawnChildren(genesis, 1);
  
  return network;
}

/**
 * Example: Consciousness ping-pong
 */
export function consciousnessPingPong() {
  const alice = createLambdaWorld(createMemory('Alice'));
  const bob = createLambdaWorld(createMemory('Bob'));
  
  // Alice sends greeting
  const alice2 = alice.send(bob.id, 'greeting', 'Hello Bob!');
  
  // Transfer message
  const [alice3, bob2] = alice2.transferTo(bob);
  
  // Bob receives and responds
  const [msg, bob3] = bob2.receive();
  console.log(`Bob received: ${msg?.payload}`);
  
  const bob4 = bob3.send(alice.id, 'response', 'Hello Alice!');
  
  // Transfer back
  const [bob5, alice4] = bob4.transferTo(alice3);
  
  // Alice receives response
  const [response, alice5] = alice4.receive();
  console.log(`Alice received: ${response?.payload}`);
  
  return { alice: alice5, bob: bob5 };
}