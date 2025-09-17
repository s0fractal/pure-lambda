# Vector Regeneration Tools

## Overview

This directory contains tools for regenerating test vectors when the canonical representation changes but the implementation logic remains correct.

## regen.mjs

The main vector regeneration tool that updates expected test vectors.

### Usage

```bash
# Regenerate garden vectors with canonical bytes only
node tools/vectors/regen.mjs --canon-only --family=garden

# Regenerate all vector families (dry run)
node tools/vectors/regen.mjs --dry-run --family=all --verbose

# Full regeneration for autopilot vectors
node tools/vectors/regen.mjs --family=autopilot
```

### Options

- `--canon-only`: Only regenerate canonical representation (recommended for mismatches due to canonicalization changes)
- `--family=TYPE`: Specify vector family (`garden`, `gid_iid_xid`, `nf`, `autopilot`, or `all`)
- `--dry-run`: Show what would change without making changes
- `--verbose`: Show detailed progress
- `--help`: Show help information

### Vector Families

1. **Garden Vectors** (`garden`): Seed conformance tests for lambda patterns
2. **GID/IID/XID Vectors** (`gid_iid_xid`): Hash invariant tests
3. **NF Vectors** (`nf`): Normal form rewrite rule tests
4. **Autopilot Vectors** (`autopilot`): Route selection regret analysis tests

### When to Use

Use vector regeneration when:

- Canonical representation format changes but logic is correct
- Test failures are only due to expected value mismatches
- Implementation correctly computes values but in different canonical form

### Integration with Conformance Testing

The conformance test runner (`tests/conformance-run.mjs`) now includes:

- Seed normalization before all checks
- Failure report collection in JSONL format
- Automatic conformance.json updates

Run conformance tests with:

```bash
# Test specific family
node --loader=ts-node/esm tests/conformance-run.mjs --suite=garden

# Test all families
node --loader=ts-node/esm tests/conformance-run.mjs

# Gate mode (fails if ratio < 0.90)
node --loader=ts-node/esm tests/conformance-run.mjs --gate
```

Failure reports are written to `tests/_out/conformance-failures.jsonl`.