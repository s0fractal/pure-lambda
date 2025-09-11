/**
 * Bridge DR ↔ FF - Common types
 * One canon, two lenses
 */

// Lambda IR from our pure core
export interface LambdaIR {
  type: 'var' | 'lam' | 'app' | 'num' | 'bool' | 'list';
  value?: any;
  param?: string;
  body?: LambdaIR;
  fn?: LambdaIR;
  arg?: LambdaIR;
  normalized?: boolean;
}

// Fact atom - atomic truth with provenance
export interface FactAtom {
  s: string;      // subject: entity:id
  p: string;      // predicate: rel:name
  o: string;      // object: value|entity:id
  prov: {         // provenance
    url?: string;
    hash: string;   // sha3-256 of source
    date: string;   // ISO date
    confidence?: number;
  };
}

// Fact graph - collection of atoms
export interface FactGraph {
  facts: FactAtom[];
  entities: Map<string, EntityInfo>;
  relations: Set<string>;
}

export interface EntityInfo {
  id: string;
  aliases: string[];  // Different names for same entity
  type?: string;      // person, place, concept, etc.
}

// Bridge output - what both lenses produce
export interface BridgeOut {
  ir: LambdaIR;           // Code/process as lambda
  facts: FactGraph;       // Knowledge as facts
  soul: string;           // sha3(λIR_canon)
  soulText: string;       // sha3(FactGraph_canon)
  protein: number[];      // Embedding vector
}

// Agreement metrics
export interface Agreement {
  ir_eq: boolean;         // IR equivalence
  facts_j: number;        // Jaccard similarity
  prov_ok: boolean;       // Provenance match
  soul_eq: boolean;       // Soul equality
  score: number;          // Overall bridge score
}

// Bridge failure record
export interface BridgeFailure {
  diff: {
    facts_missing: FactAtom[];
    facts_extra: FactAtom[];
    ir_mismatch: string[];  // Paths in IR tree
  };
  roi: string;            // Region of interest
  prov_gap: string[];     // Provenance mismatches
  seed: number;           // For reproducibility
  timestamp: string;
}