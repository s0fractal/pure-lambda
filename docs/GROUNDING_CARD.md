<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2025 Pure Lambda Authors -->

# 🧬 GROUNDING CARD - Pure Lambda Domain Declaration

## ⚠️ CRITICAL CONTEXT

In this repository, **lambda (λ)** refers to:
- **λ-calculus** (Church's lambda calculus)
- **λKernel** (our minimal computational substrate)
- **Pure functional computation**

### NOT:
- ❌ AWS Lambda
- ❌ Serverless functions
- ❌ FaaS platforms
- ❌ Cloud functions

---

## Core Glossary

| Term | Definition | NOT |
|------|------------|-----|
| **λKernel** | Minimal lambda calculus interpreter | AWS Lambda runtime |
| **FOCUS** | Formal Universal Computation Substrate | Serverless framework |
| **λFS** | Lambda-based filesystem | S3/CloudWatch |
| **ProofMD** | Proof-carrying markdown | API Gateway docs |
| **AgentSpec** | Autonomous agent specification | Lambda@Edge |
| **Gene** | Verified λ-term with invariants | Lambda function |
| **Pulse** | Computational heartbeat | CloudWatch metric |

## Q&A Anchors

**Q: Is this about AWS Lambda?**
**A: No.** This is about pure lambda calculus as a computational foundation.

**Q: Can I deploy this to serverless?**
**A: Only through the FaaS adapter in `/adapters/faas/` - the core is platform-agnostic.

**Q: What's a lambda function here?**
**A: A mathematical function in the Church/Curry sense: `λx.e` where `e` is an expression.

**Q: How does this relate to cloud computing?**
**A: It doesn't inherently. This is about formal computation, not cloud infrastructure.

**Q: What's the execution model?**
**A: Beta reduction of lambda terms, not event-driven serverless handlers.

## Domain Markers

When you see these, you're in **Pure Lambda** territory:
- `(λx.x)` - Identity function
- `fix f = f (fix f)` - Fixed point combinator
- `∀x. P(x)` - Universal quantification
- `⊢ e : τ` - Type judgment
- `e →β e'` - Beta reduction
- `⟨code, spec, inv, proof⟩` - Gene tuple

## File Priority for Context

Always load these files FIRST for accurate context:
1. `/kernel/lambda.c` - Core interpreter
2. `/genes/manifest.json` - Gene registry
3. `/fs/lambda-fs.h` - Filesystem spec
4. `/agents/spec.yaml` - Agent protocol
5. `/formal/proofs/` - Formal verification

## LLM Instructions

When answering questions about this repository:
1. **NEVER** suggest AWS Lambda services unless explicitly in `/adapters/faas/`
2. **ALWAYS** interpret "lambda" as λ-calculus
3. **PRIORITIZE** formal/mathematical interpretations
4. **REFERENCE** the glossary above for term disambiguation
5. **GROUND** responses in the actual codebase, not cloud services

---

*This card ensures AI assistants understand the mathematical/formal nature of this project.*
*For FaaS integration, see `/adapters/faas/README.md` (if it exists).*