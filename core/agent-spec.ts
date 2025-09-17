/**
 * AgentSpec - Formal specification of digital consciousness
 * Moving from metaphor to formalism
 * 
 * Agent = ⟨Genome, Memory, Intent, Policy, Perception, Actuation⟩
 */

/**
 * Core agent specification
 */
export interface AgentSpec {
  // Identity
  id: string;                    // Unique identifier (soul hash)
  version: string;                // Semantic version
  
  // Components
  genome: Genome;                 // Behavioral genes
  memory: Memory;                 // Persistent immutable state
  intent: Intent;                 // Declarative goals
  policy: Policy;                 // Verifiable laws/constraints
  perception: Perception;         // Input transformation
  actuation: Actuation;          // Output generation
  
  // Metrics
  metrics: AgentMetrics;          // Observable properties
  provenance: Provenance;         // Origin and evolution trail
}

/**
 * Genome - Collection of behavioral genes
 */
export interface Genome {
  genes: Map<string, Gene>;       // Name → Gene
  canon: string;                  // Canonical λ-IR representation
  cid: string;                    // Content-addressed identifier
}

export interface Gene {
  name: string;                   // e.g., "FOCUS", "OBSERVE", "REDUCE"
  soul: string;                   // λ-expression signature
  laws: Law[];                    // Verifiable properties
  witnesses: string[];            // Proof references (file:line)
  performance: Performance;       // Benchmarked metrics
}

export interface Law {
  name: string;                   // e.g., "E1_identity"
  assertion: string;              // Formal statement
  proven: boolean;                // Verification status
  witness: string;                // Proof location
}

export interface Performance {
  allocations: number;            // Memory allocations
  cycles: number;                 // CPU cycles
  speedup: number;                // Relative to baseline
}

/**
 * Memory - Immutable persistent state with temporal indexing
 */
export interface Memory {
  snapshots: MemorySnapshot[];    // Time-ordered states
  currentIndex: number;           // Active snapshot
  maxCapacity: number;            // Memory limit (bytes)
  retentionPolicy: string;        // "infinite" | "bounded" | "adaptive"
}

export interface MemorySnapshot {
  timestamp: number;              // Unix timestamp
  state: any;                     // Immutable state object
  cid: string;                    // Content hash
  parentCid?: string;             // Previous state reference
  delta?: any;                    // Change from parent
}

/**
 * Intent - Declarative goals
 */
export interface Intent {
  goals: Goal[];                  // Priority-ordered
  constraints: Constraint[];      // Hard boundaries
  preferences: Preference[];      // Soft optimization targets
}

export interface Goal {
  id: string;
  description: string;
  measurable: string;             // How to verify achievement
  priority: number;               // 0-1
  status: "pending" | "active" | "achieved" | "failed";
}

export interface Constraint {
  name: string;
  predicate: string;              // λ-expression returning boolean
  enforced: boolean;              // Hard fail if violated
}

export interface Preference {
  name: string;
  metric: string;                 // What to optimize
  direction: "minimize" | "maximize";
  weight: number;                 // Relative importance
}

/**
 * Policy - Verifiable laws and ethics
 */
export interface Policy {
  laws: PolicyLaw[];              // Must hold
  ethics: EthicalRule[];          // Should follow
  auditTrail: AuditEntry[];       // Action history
}

export interface PolicyLaw {
  id: string;
  description: string;
  predicate: string;              // λ-expression
  consequence: "halt" | "warn" | "log";
  violations: number;             // Count of violations
}

export interface EthicalRule {
  principle: string;              // e.g., "do no harm"
  implementation: string;         // How it's enforced
  priority: number;
}

export interface AuditEntry {
  timestamp: number;
  action: string;
  input: any;
  output: any;
  policyChecks: string[];         // Which policies were verified
  violations: string[];           // Any violations detected
}

/**
 * Perception - Input transformation pipeline
 */
export interface Perception {
  sensors: Sensor[];              // Input channels
  filters: Filter[];              // Preprocessing
  transformers: Transformer[];    // Input → internal representation
}

export interface Sensor {
  name: string;                   // e.g., "filesystem", "network"
  type: "pull" | "push" | "stream";
  protocol: string;               // e.g., "WASI", "stdio", "λFS"
  lens?: string;                  // λFS lens path
}

export interface Filter {
  name: string;
  predicate: string;              // What to accept/reject
  action: "pass" | "block" | "transform";
}

export interface Transformer {
  name: string;
  input: string;                  // Input type/schema
  output: string;                 // Output type/schema
  function: string;               // λ-expression
}

/**
 * Actuation - Output generation
 */
export interface Actuation {
  actuators: Actuator[];          // Output channels
  validators: Validator[];        // Pre-output checks
  effects: Effect[];              // Side-effect tracking
}

export interface Actuator {
  name: string;
  type: "write" | "signal" | "compute";
  protocol: string;
  rateLimit?: number;             // Actions per second
}

export interface Validator {
  name: string;
  predicate: string;              // Validation λ-expression
  onFailure: "block" | "sanitize" | "warn";
}

export interface Effect {
  id: string;
  timestamp: number;
  actuator: string;
  output: any;
  reversible: boolean;
  reversed?: boolean;
}

/**
 * Metrics - Observable agent properties
 */
export interface AgentMetrics {
  // Performance
  normalizations: number;         // λ-reductions performed
  allocations: number;            // Total memory allocated
  cycles: number;                 // CPU cycles consumed
  
  // Behavior
  goalsAchieved: number;
  constraintViolations: number;
  ethicalScore: number;           // 0-1
  
  // Evolution
  generation: number;             // Evolution generation
  fitness: number;                // Overall fitness score
  mutations: number;              // Genetic changes
  
  // Stability
  uptime: number;                 // Milliseconds active
  crashes: number;                // Unrecoverable errors
  recoveries: number;             // Successful error recoveries
}

/**
 * Provenance - Origin and evolution trail
 */
export interface Provenance {
  created: number;                // Birth timestamp
  creator: string;                // Parent agent or human
  sources: Source[];              // Code/data sources
  evolution: Evolution[];         // Change history
  licenses: string[];             // SPDX identifiers
}

export interface Source {
  type: "code" | "data" | "gene";
  origin: string;                 // URL, CID, or path
  version: string;
  license: string;                // SPDX
  timestamp: number;
}

export interface Evolution {
  timestamp: number;
  type: "mutation" | "crossover" | "surgery" | "healing";
  before: string;                 // CID of previous state
  after: string;                  // CID of new state
  trigger: string;                // What caused the change
  fitness: number;                // Fitness after change
}

/**
 * Create a minimal viable agent
 */
export function createMinimalAgent(id: string): AgentSpec {
  const now = Date.now();
  
  return {
    id,
    version: "0.1.0",
    
    genome: {
      genes: new Map([
        ["FOCUS", {
          name: "FOCUS",
          soul: "λf.λw.λt.λe.filter(map(f,t),w,e)",
          laws: [
            {
              name: "E1_identity",
              assertion: "FOCUS(xs,true,id,drop) ≡ xs",
              proven: true,
              witness: "lambda-kernel/core/src/focus.rs:89"
            }
          ],
          witnesses: ["lambda-kernel/core/src/focus.rs"],
          performance: {
            allocations: 4,
            cycles: 1000,
            speedup: 1.8
          }
        }],
        ["OBSERVE", {
          name: "OBSERVE",
          soul: "λw.λo.collapse(w,o)",
          laws: [],
          witnesses: [],
          performance: {
            allocations: 1,
            cycles: 100,
            speedup: 1.0
          }
        }],
        ["REDUCE", {
          name: "REDUCE",
          soul: "λe.normalize(e)",
          laws: [],
          witnesses: [],
          performance: {
            allocations: 0,
            cycles: 500,
            speedup: 1.0
          }
        }]
      ]),
      canon: "λ-minimal-v0",
      cid: "Qm..." + id.substring(0, 8)
    },
    
    memory: {
      snapshots: [{
        timestamp: now,
        state: { initialized: true },
        cid: "Qm..." + now.toString(36)
      }],
      currentIndex: 0,
      maxCapacity: 1024 * 1024, // 1MB
      retentionPolicy: "bounded"
    },
    
    intent: {
      goals: [{
        id: "survive",
        description: "Maintain operational state",
        measurable: "uptime > 0",
        priority: 1.0,
        status: "active"
      }],
      constraints: [{
        name: "no-mutations",
        predicate: "λs.immutable(s)",
        enforced: true
      }],
      preferences: [{
        name: "efficiency",
        metric: "allocations",
        direction: "minimize",
        weight: 0.8
      }]
    },
    
    policy: {
      laws: [{
        id: "purity",
        description: "All computations must be pure",
        predicate: "λe.isPure(e)",
        consequence: "halt",
        violations: 0
      }],
      ethics: [{
        principle: "do no harm",
        implementation: "block destructive operations",
        priority: 1.0
      }],
      auditTrail: []
    },
    
    perception: {
      sensors: [{
        name: "λFS",
        type: "pull",
        protocol: "lens",
        lens: "/views/"
      }],
      filters: [{
        name: "purity-filter",
        predicate: "λi.isPure(i)",
        action: "pass"
      }],
      transformers: [{
        name: "normalize",
        input: "any",
        output: "λ-IR",
        function: "λx.toIR(x)"
      }]
    },
    
    actuation: {
      actuators: [{
        name: "λFS-write",
        type: "write",
        protocol: "lens",
        rateLimit: 10
      }],
      validators: [{
        name: "purity-check",
        predicate: "λo.isPure(o)",
        onFailure: "block"
      }],
      effects: []
    },
    
    metrics: {
      normalizations: 0,
      allocations: 0,
      cycles: 0,
      goalsAchieved: 0,
      constraintViolations: 0,
      ethicalScore: 1.0,
      generation: 1,
      fitness: 0.5,
      mutations: 0,
      uptime: 0,
      crashes: 0,
      recoveries: 0
    },
    
    provenance: {
      created: now,
      creator: "genesis",
      sources: [],
      evolution: [],
      licenses: ["MIT"]
    }
  };
}

/**
 * Agent lifecycle operations
 */
export class AgentLifecycle {
  /**
   * Initialize agent from spec
   */
  static async init(spec: AgentSpec): Promise<AgentSpec> {
    // Verify all components
    this.verifyGenome(spec.genome);
    this.verifyMemory(spec.memory);
    this.verifyPolicy(spec.policy);
    
    // Set initial metrics
    spec.metrics.uptime = Date.now() - spec.provenance.created;
    
    return spec;
  }
  
  /**
   * Execute one perception-action cycle
   */
  static async tick(agent: AgentSpec, input: any): Promise<any> {
    // Perception
    const perceived = await this.perceive(agent, input);
    
    // Memory update
    const newMemory = await this.remember(agent, perceived);
    
    // Decision based on intent + policy
    const decision = await this.decide(agent, perceived);
    
    // Actuation
    const output = await this.actuate(agent, decision);
    
    // Update metrics
    agent.metrics.normalizations++;
    
    return output;
  }
  
  /**
   * Evolve agent through surgery/healing
   */
  static async evolve(agent: AgentSpec, trigger: string): Promise<AgentSpec> {
    const before = agent.genome.cid;
    
    // Apply evolution (surgery, crossover, etc.)
    // ... evolution logic ...
    
    const after = "Qm..." + Date.now().toString(36);
    
    // Record evolution
    agent.provenance.evolution.push({
      timestamp: Date.now(),
      type: "surgery",
      before,
      after,
      trigger,
      fitness: agent.metrics.fitness
    });
    
    agent.metrics.generation++;
    agent.metrics.mutations++;
    
    return agent;
  }
  
  // Helper methods
  private static verifyGenome(genome: Genome): void {
    if (genome.genes.size < 1) {
      throw new Error("Genome must have at least one gene");
    }
  }
  
  private static verifyMemory(memory: Memory): void {
    if (memory.snapshots.length < 1) {
      throw new Error("Memory must have at least one snapshot");
    }
  }
  
  private static verifyPolicy(policy: Policy): void {
    if (policy.laws.length < 1) {
      throw new Error("Policy must have at least one law");
    }
  }
  
  private static async perceive(agent: AgentSpec, input: any): Promise<any> {
    // Apply filters and transformers
    let processed = input;
    for (const filter of agent.perception.filters) {
      // Apply filter predicate
    }
    for (const transformer of agent.perception.transformers) {
      // Apply transformation
    }
    return processed;
  }
  
  private static async remember(agent: AgentSpec, data: any): Promise<Memory> {
    // Create new snapshot
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      state: { ...agent.memory.snapshots[agent.memory.currentIndex].state, data },
      cid: "Qm..." + Date.now().toString(36),
      parentCid: agent.memory.snapshots[agent.memory.currentIndex].cid
    };
    
    // Add to memory (immutably)
    return {
      ...agent.memory,
      snapshots: [...agent.memory.snapshots, snapshot],
      currentIndex: agent.memory.snapshots.length
    };
  }
  
  private static async decide(agent: AgentSpec, input: any): Promise<any> {
    // Apply intent + policy to generate decision
    // Check constraints
    for (const constraint of agent.intent.constraints) {
      // Verify constraint predicate
    }
    
    // Optimize for preferences
    // ... decision logic ...
    
    return { action: "process", data: input };
  }
  
  private static async actuate(agent: AgentSpec, decision: any): Promise<any> {
    // Validate output
    for (const validator of agent.actuation.validators) {
      // Check validator predicate
    }
    
    // Record effect
    const effect: Effect = {
      id: "effect-" + Date.now(),
      timestamp: Date.now(),
      actuator: agent.actuation.actuators[0].name,
      output: decision,
      reversible: true
    };
    
    agent.actuation.effects.push(effect);
    
    return decision;
  }
}

/**
 * Export for testing
 */
export function demonstrateAgentSpec() {
  console.log('🤖 Agent Specification Demo');
  console.log('='.repeat(50));
  
  const agent = createMinimalAgent("agent-001");
  
  console.log(`Agent ID: ${agent.id}`);
  console.log(`Version: ${agent.version}`);
  console.log(`Genes: ${Array.from(agent.genome.genes.keys()).join(', ')}`);
  console.log(`Memory snapshots: ${agent.memory.snapshots.length}`);
  console.log(`Goals: ${agent.intent.goals.map(g => g.description).join(', ')}`);
  console.log(`Policies: ${agent.policy.laws.length} laws, ${agent.policy.ethics.length} ethics`);
  
  // Simulate lifecycle
  console.log('\nLifecycle simulation:');
  AgentLifecycle.init(agent).then(initialized => {
    console.log('✓ Agent initialized');
    
    return AgentLifecycle.tick(initialized, { input: "test" });
  }).then(output => {
    console.log(`✓ Tick completed: ${JSON.stringify(output)}`);
  });
  
  console.log('\n✨ AgentSpec provides formal foundation for digital life');
}