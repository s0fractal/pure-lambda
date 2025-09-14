# Rosetta-λ: Hieroglyphics as Lambda Calculus

*A playful formal projection of Egyptian hieroglyphic structure into λ-terms*

## ⚠️ Disclaimer

This is a **formal game**, not linguistics. We project structural patterns onto lambda calculus for fun and insight, making no claims about actual Egyptian language.

## Core Idea

Linear hieroglyphic notation (MdC-like) → λ-terms → type checking → SVG visualization

## Notation (Simplified MdC)

| Symbol | Meaning | λ-Projection |
|--------|---------|--------------|
| `:` | Composition within word | Right application |
| `-` | Word connection | Left application |
| `[]` | Cartouche (royal name) | Lambda binding context |
| `{DET:X}` | Determinative | Type refinement/intersection |
| `space` | Word boundary | Application boundary |

## Projection Rules

### 1. Basic Terms
```
nfr → GOOD : Quality
rmT → person : Entity
niwt → city : Place
```

### 2. Determinatives as Type Refinement
```
X:{DET:T} → X : (type(X) ∧ T)
```
Example: `rmT:{DET:HUMAN}` → `person : (Entity ∧ HUMAN)`

### 3. Cartouche as Lambda Binding
```
[NAME] → λtitle. PHARAOH title
```
Creates a named subject context for the phrase.

### 4. Composition Order
1. Intra-word (`:`) - right associative
2. Inter-word (`-`) - left associative
3. Free terms - by position

### 5. Predicates and Relations
```
m → IN : Place -> Entity -> Prop
Hr → UPON : Entity -> Entity -> Prop
```

## Type System

### Base Types
- `Entity` - beings, objects
- `Quality` - attributes
- `Place` - locations
- `Action` - verbs
- `Prop` - propositions

### Determinative Types (Refine Base)
- `HUMAN ⊆ Entity`
- `GOD ⊆ Entity`
- `ANIMAL ⊆ Entity`
- `PLACE ⊆ Place`
- `QUALITY ⊆ Quality`
- `ABSTRACT ⊆ Quality`

### Type Checking
```
Γ ⊢ e : τ
───────────────── (DET)
Γ ⊢ e:{DET:σ} : τ ∧ σ
```

## Examples

### Simple Phrase
**Input**: `rmT:{DET:HUMAN} nfr:{DET:QUALITY} m niwt:{DET:PLACE}`
**Parse**: "person good in city"
**λ-term**: `(IN city person) ∧ (ATTR person GOOD)`
**Type**: `Prop`

### With Cartouche
**Input**: `[nsw-bity] m niwt:{DET:PLACE}`
**Parse**: "[pharaoh] in city"
**λ-term**: `let SUBJECT = (λt. PHARAOH t) "nsw-bity" in (IN city SUBJECT)`
**Type**: `Prop`

### Complex Composition
**Input**: `rmT:nTr:{DET:GOD} Hr st:{DET:PLACE}`
**Parse**: "person:god upon throne"
**λ-term**: `(UPON throne (COMPOSE god person))`
**Type**: `Prop`

## Reduction Semantics

### β-reduction
Standard lambda calculus reduction:
```
(λx. e) v →β e[v/x]
```

### Composition reduction
```
COMPOSE : (α -> β) -> (γ -> α) -> (γ -> β)
COMPOSE f g = λx. f (g x)
```

### Determinative checking
```
check(e:{DET:T}) =
  if subtype(type(e), T)
  then e
  else ERROR("Type mismatch")
```

## SVG Visualization

Each phrase generates an SVGx showing:
1. **Parse tree** - hierarchical structure
2. **Type derivation** - proof tree
3. **Reduction trace** - β-reduction steps
4. **Final form** - normalized λ-term

## File Structure

```
/rosetta-lambda/
├── spec.md                 # This file
├── mapping/
│   ├── egyptian_mdc.yaml   # Term/type mappings
│   └── determinatives.yaml # DET definitions
├── examples/
│   ├── simple.mdc          # Basic phrases
│   ├── cartouche.mdc       # Royal names
│   └── complex.mdc         # Full sentences
├── tools/
│   ├── mdc2lambda.py       # Parser
│   └── lambda2svg.py       # Visualizer
└── viz/
    └── traces/             # SVG outputs
```

## Usage

```bash
# Parse and type-check
make rl-parse FILE=examples/simple.mdc

# Show reduction steps
make rl-reduce FILE=examples/simple.mdc

# Generate SVG visualization
make rl-svg FILE=examples/simple.mdc
```

## Why This Works

1. **Structural projection** - We're mapping syntactic patterns, not semantics
2. **Type discipline** - Determinatives naturally map to type refinements
3. **Compositionality** - Hieroglyphic composition mirrors function application
4. **Visual proof** - SVG makes the formal structure visible

## Extensions

- Add more scripts (Sumerian cuneiform, Maya glyphs)
- Bidirectional type checking
- Dependent types for divine/royal contexts
- Temporal logic for verb aspects

---

*"When ancient symbols meet modern formalism, structure transcends time."*