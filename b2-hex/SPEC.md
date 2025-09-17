# B2-Hex Specification v0.1

## Core Concept
Execution as hexagonal field navigation with vector optimization.

## Hex Tile = Operator (exactly 6 keys)
```yaml
op: FOCUS              # Atom/combinator name
ph: ph_f0c5000...      # Deterministic phash
ports: W->E            # Port mapping (6 directions)
cost: lat=12µs,mem=1k  # Local cost from receipts
law: a→Option b        # Semantic type/law
cid: Qm62651d02...     # Receipt signature
```

## Port Conventions
- **Directions**: N, NE, SE, S, SW, NW (60° apart)
- **THEN**: W->E (straight pipe)
- **SPLIT**: W->NE,SE (fan-out 60°)
- **MERGE**: NW,SW->E (fan-in symmetric)
- **DELAY**: E->E@t+1 (vertical to next layer)
- **SCAN**: W->E + internal state
- **PAIR**: N,S->E (tuple packing)

## Field Dimensions
1. **X,Y**: Spatial routing (axial hex coordinates)
2. **T**: Time layers (DELAY moves up)
3. **Profile**: Cost weights (apex/proof/perf)

## Routing Algorithm
```
A* on hex grid where:
- h(n) = axial_distance(n, goal)
- g(n) = Σ(tile.cost × profile.weight)
- Constraints:
  - Branches only via SPLIT
  - Joins only via MERGE
  - Cycles must contain DELAY
  - Max 2 external imports
```

## B2↔Hex Conversion
- **Hex→B2**: Read port connections, infer THEN/SPLIT/MERGE
- **B2→Hex**: Toposort + hex layout with 60° branches
- **Invariant**: phash(hex_field) = phash(b2_ast)

## Safety
- Each tile has Gate G0 receipt
- BIOLOCK filters dangerous routes
- PAC bounds on routing decisions