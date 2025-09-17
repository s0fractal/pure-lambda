# NF DOE Test Summary Report

Generated: 2025-09-16T11:27:20.877Z

## Overall Results

- **Total Tests**: 18
- **Passed**: 4 (22%)
- **Failed**: 0 (0%)
- **Errors**: 14 (78%)

## Test Categories

### THEN(id,f) → f Rules
- Tests: 6, Passed: 1, Success Rate: 17%

### SPLIT▶MERGE(id,id) → id Rules
- Tests: 6, Passed: 2, Success Rate: 33%

### FOCUS∘FOCUS → FOCUS' Rules
- Tests: 6, Passed: 1, Success Rate: 17%

## Detailed Results

| Test Name | Status | Execution Time | Expected Delta | Actual Delta | Patches | Error |
|-----------|--------|---------------|----------------|--------------|---------|-------|
| THEN_ID_basic | ERROR | 1379ms | {"hops":-1,"lat":-1,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0 |\n| THEN_ID_nested | ERROR | 1370ms | {"hops":-1,"lat":-1,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0 |\n| THEN_ID_chained | ERROR | 1200ms | {"hops":-1,"lat":-1,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0 |\n| THEN_ID_async | ERROR | 1161ms | {"hops":-1,"lat":-1,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0 |\n| THEN_ID_port_variants | ERROR | 1123ms | {"hops":-1,"lat":-1,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0 |\n| THEN_ID_effects | PASS | 1265ms | {"hops":0,"lat":0,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | None |\n| SPLIT_MERGE_basic | ERROR | 1131ms | {"hops":-2,"lat":-2,"mem":-1} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-2,"lat":-2,"mem":-1}, actual patches: 0 |\n| SPLIT_MERGE_complex | ERROR | 1098ms | {"hops":-2,"lat":-2,"mem":-1} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-2,"lat":-2,"mem":-1}, actual patches: 0 |\n| SPLIT_MERGE_typed | ERROR | 1123ms | {"hops":-2,"lat":-2,"mem":-1} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-2,"lat":-2,"mem":-1}, actual patches: 0 |\n| SPLIT_MERGE_async | ERROR | 1156ms | {"hops":-2,"lat":-2,"mem":-1} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-2,"lat":-2,"mem":-1}, actual patches: 0 |\n| SPLIT_MERGE_branch_filter | PASS | 1142ms | {"hops":0,"lat":0,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | None |\n| SPLIT_MERGE_law_mismatch | PASS | 1145ms | {"hops":0,"lat":0,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | None |\n| FOCUS_COMPOSE_basic | ERROR | 1152ms | {"hops":-1,"lat":-1,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0 |\n| FOCUS_COMPOSE_chained | ERROR | 1110ms | {"hops":-1,"lat":-1,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0 |\n| FOCUS_COMPOSE_typed | ERROR | 1336ms | {"hops":-1,"lat":-1,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0 |\n| FOCUS_COMPOSE_async | ERROR | 1161ms | {"hops":-1,"lat":-1,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0 |\n| FOCUS_COMPOSE_parallel | ERROR | 1100ms | {"hops":-1,"lat":-1,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0 |\n| FOCUS_COMPOSE_effects | PASS | 1105ms | {"hops":0,"lat":0,"mem":0} | {"hops":0,"lat":0,"mem":0} | 0 | None |

## Analysis

### Performance Metrics
- Average execution time: 1181ms
- Total patches applied: 0
- Successful transformations: 0

### Issues Identified
- **THEN_ID_basic**: Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0\n- **THEN_ID_nested**: Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0\n- **THEN_ID_chained**: Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0\n- **THEN_ID_async**: Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0\n- **THEN_ID_port_variants**: Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0\n- **SPLIT_MERGE_basic**: Expected transformation but none occurred. Expected delta: {"hops":-2,"lat":-2,"mem":-1}, actual patches: 0\n- **SPLIT_MERGE_complex**: Expected transformation but none occurred. Expected delta: {"hops":-2,"lat":-2,"mem":-1}, actual patches: 0\n- **SPLIT_MERGE_typed**: Expected transformation but none occurred. Expected delta: {"hops":-2,"lat":-2,"mem":-1}, actual patches: 0\n- **SPLIT_MERGE_async**: Expected transformation but none occurred. Expected delta: {"hops":-2,"lat":-2,"mem":-1}, actual patches: 0\n- **FOCUS_COMPOSE_basic**: Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0\n- **FOCUS_COMPOSE_chained**: Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0\n- **FOCUS_COMPOSE_typed**: Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0\n- **FOCUS_COMPOSE_async**: Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0\n- **FOCUS_COMPOSE_parallel**: Expected transformation but none occurred. Expected delta: {"hops":-1,"lat":-1,"mem":0}, actual patches: 0

### Delta Validation
No transformations were applied.

## Recommendations

- Review failing test cases for specific issues
