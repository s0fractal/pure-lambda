#!/usr/bin/env python3
"""
MdC to Lambda Parser
Converts hieroglyphic notation to λ-terms with type checking
"""

import re
import yaml
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class Term:
    """Lambda term with type annotation"""
    expr: str
    type: str
    raw: str

@dataclass
class ParseResult:
    """Result of parsing MdC notation"""
    lambda_term: str
    type: str
    derivation: List[str]
    svg_data: Dict

class MdCParser:
    def __init__(self, mapping_file: str):
        """Initialize with mapping dictionary"""
        with open(mapping_file, 'r') as f:
            self.mapping = yaml.safe_load(f)

        self.terms = self.mapping['terms']
        self.determinatives = self.mapping['determinatives']

    def tokenize(self, mdc: str) -> List[Tuple[str, str]]:
        """Tokenize MdC input into (token, type) pairs"""
        tokens = []

        # Patterns
        cartouche_re = r'\[([^\]]+)\]'
        det_re = r'{DET:(\w+)}'

        # Process input
        remaining = mdc
        while remaining:
            remaining = remaining.strip()

            # Cartouche
            if match := re.match(cartouche_re, remaining):
                tokens.append((match.group(1), 'CARTOUCHE'))
                remaining = remaining[match.end():]

            # Determinative
            elif match := re.match(det_re, remaining):
                tokens.append((match.group(1), 'DET'))
                remaining = remaining[match.end():]

            # Composition operators
            elif remaining.startswith(':'):
                tokens.append((':', 'COMPOSE'))
                remaining = remaining[1:]

            elif remaining.startswith('-'):
                tokens.append(('-', 'CONNECT'))
                remaining = remaining[1:]

            # Word boundary
            elif remaining.startswith(' '):
                tokens.append((' ', 'SPACE'))
                remaining = remaining[1:]

            # Regular term
            else:
                # Find next special character
                next_special = len(remaining)
                for i, c in enumerate(remaining):
                    if c in ':-{[ ':
                        next_special = i
                        break

                term = remaining[:next_special]
                if term:
                    tokens.append((term, 'TERM'))
                remaining = remaining[next_special:]

        return tokens

    def parse_term(self, tokens: List[Tuple[str, str]],
                  start: int = 0) -> Tuple[Term, int]:
        """Parse a single term with potential determinatives"""
        if start >= len(tokens):
            return None, start

        token, token_type = tokens[start]

        # Handle cartouche
        if token_type == 'CARTOUCHE':
            lambda_expr = f"(λtitle. PHARAOH title) \"{token}\""
            return Term(lambda_expr, "Entity", token), start + 1

        # Handle regular term
        if token_type == 'TERM':
            if token in self.terms:
                term_info = self.terms[token]
                expr = term_info['lambda']
                type_sig = term_info['type']

                # Check for following determinative
                if start + 1 < len(tokens) and tokens[start + 1][0] == ':':
                    if start + 2 < len(tokens) and tokens[start + 2][1] == 'DET':
                        det_name = tokens[start + 2][0]
                        if det_name in self.determinatives:
                            det_info = self.determinatives[det_name]
                            # Type intersection
                            type_sig = f"({type_sig} ∧ {det_name})"
                            return Term(expr, type_sig, token), start + 3

                return Term(expr, type_sig, token), start + 1
            else:
                # Unknown term
                return Term(token, "?", token), start + 1

        return None, start + 1

    def parse_phrase(self, mdc: str) -> ParseResult:
        """Parse complete MdC phrase into lambda term"""
        tokens = self.tokenize(mdc)
        terms = []
        derivation = []

        derivation.append(f"Input: {mdc}")
        derivation.append(f"Tokens: {tokens}")

        # Parse all terms
        i = 0
        while i < len(tokens):
            if tokens[i][1] in ['TERM', 'CARTOUCHE']:
                term, next_i = self.parse_term(tokens, i)
                if term:
                    terms.append(term)
                    derivation.append(f"Parsed: {term.raw} → {term.expr} : {term.type}")
                i = next_i
            else:
                i += 1

        # Combine terms into final expression
        if not terms:
            return ParseResult("⊥", "Error", derivation, {})

        # Simple combination logic (can be enhanced)
        if len(terms) == 1:
            final_expr = terms[0].expr
            final_type = terms[0].type
        else:
            # Look for predicates (like IN, UPON)
            predicates = [t for t in terms if t.type.startswith("Place ->")
                         or t.type.startswith("Entity ->")]

            if predicates:
                # Apply predicate to arguments
                pred = predicates[0]
                args = [t for t in terms if t != pred]

                if len(args) >= 2:
                    final_expr = f"({pred.expr} {args[0].expr} {args[1].expr})"
                    final_type = "Prop"
                else:
                    final_expr = f"({pred.expr} {args[0].expr})"
                    final_type = self.infer_type(pred.type, args[0].type)
            else:
                # Default: conjunction of attributes
                final_expr = " ∧ ".join(f"({t.expr})" for t in terms)
                final_type = "Prop"

        derivation.append(f"Final: {final_expr} : {final_type}")

        # Generate SVG data
        svg_data = self.generate_svg_data(terms, final_expr)

        return ParseResult(final_expr, final_type, derivation, svg_data)

    def infer_type(self, pred_type: str, arg_type: str) -> str:
        """Simple type inference for application"""
        if " -> " in pred_type:
            parts = pred_type.split(" -> ")
            if len(parts) > 1:
                return " -> ".join(parts[1:])
        return "?"

    def generate_svg_data(self, terms: List[Term], final: str) -> Dict:
        """Generate data for SVG visualization"""
        return {
            'terms': [(t.raw, t.expr, t.type) for t in terms],
            'final': final,
            'tree': self.build_parse_tree(terms)
        }

    def build_parse_tree(self, terms: List[Term]) -> Dict:
        """Build parse tree for visualization"""
        return {
            'root': 'composition',
            'children': [{'value': t.expr, 'type': t.type} for t in terms]
        }


# Command-line interface
if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) < 2:
        print("Usage: mdc2lambda.py <mdc_phrase>")
        print("Example: mdc2lambda.py 'rmT:{DET:HUMAN} nfr:{DET:QUALITY} m niwt:{DET:PLACE}'")
        sys.exit(1)

    parser = MdCParser("rosetta-lambda/mapping/egyptian_mdc.yaml")
    result = parser.parse_phrase(sys.argv[1])

    print("\n" + "=" * 60)
    print("📜 Rosetta-λ Parser")
    print("=" * 60)

    print("\n📝 Derivation:")
    for step in result.derivation:
        print(f"  {step}")

    print(f"\n🔤 Lambda term: {result.lambda_term}")
    print(f"📐 Type: {result.type}")

    print("\n🎨 SVG data:")
    print(json.dumps(result.svg_data, indent=2))

    print("\n✨ Done!")