#!/bin/bash

# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Pure Lambda Authors

# KPI Gate - Enforces performance requirements
# Usage: ./kpi_gate.sh bench.out
# Fails if KPIs are not met

set -e

BENCH_FILE=${1:-bench.out}

echo "🎯 KPI Gate - Checking performance requirements..."
echo "================================================"

# Check if bench file exists
if [ ! -f "$BENCH_FILE" ]; then
    echo "❌ Benchmark file not found: $BENCH_FILE"
    exit 1
fi

# Parse benchmark results (simplified - real impl would parse JSON/CSV)
# Expected format: "Put 100k: XXXms, avg: YYYμs"

# Extract put average
PUT_AVG=$(grep "Put.*avg:" "$BENCH_FILE" | sed -E 's/.*avg: ([0-9]+)μs.*/\1/' || echo "999")
# Extract get average
GET_AVG=$(grep "Get.*avg:" "$BENCH_FILE" | sed -E 's/.*avg: ([0-9]+)μs.*/\1/' || echo "999")
# Extract snapshot time
SNAP_TIME=$(grep "Snapshot.*:" "$BENCH_FILE" | sed -E 's/.*: ([0-9]+)ms.*/\1/' || echo "999")

echo "📊 Benchmark Results:"
echo "  Put avg: ${PUT_AVG}μs (target: <100μs)"
echo "  Get avg: ${GET_AVG}μs (target: <100μs)"
echo "  Snapshot: ${SNAP_TIME}ms (target: <5ms)"
echo ""

# Check KPIs
FAILED=0

if [ "$PUT_AVG" -gt 100 ]; then
    echo "❌ Put performance failed: ${PUT_AVG}μs > 100μs"
    FAILED=1
else
    echo "✅ Put performance passed"
fi

if [ "$GET_AVG" -gt 100 ]; then
    echo "❌ Get performance failed: ${GET_AVG}μs > 100μs"
    FAILED=1
else
    echo "✅ Get performance passed"
fi

if [ "$SNAP_TIME" -gt 5 ]; then
    echo "❌ Snapshot performance failed: ${SNAP_TIME}ms > 5ms"
    FAILED=1
else
    echo "✅ Snapshot performance passed"
fi

echo ""

# Additional checks for agent performance
if grep -q "agent" "$BENCH_FILE"; then
    echo "🤖 Agent Performance:"
    
    # Check normalization time
    NORM_TIME=$(grep "normalize.*:" "$BENCH_FILE" | sed -E 's/.*: ([0-9]+)μs.*/\1/' || echo "0")
    if [ "$NORM_TIME" -gt 0 ]; then
        if [ "$NORM_TIME" -gt 100 ]; then
            echo "  ❌ Normalization: ${NORM_TIME}μs > 100μs"
            FAILED=1
        else
            echo "  ✅ Normalization: ${NORM_TIME}μs"
        fi
    fi
    
    # Check FOCUS performance
    FOCUS_SPEEDUP=$(grep "FOCUS.*speedup:" "$BENCH_FILE" | sed -E 's/.*speedup: ([0-9.]+)x.*/\1/' || echo "1.0")
    if (( $(echo "$FOCUS_SPEEDUP < 1.5" | bc -l) )); then
        echo "  ⚠️ FOCUS speedup only ${FOCUS_SPEEDUP}x (target: >1.5x)"
    else
        echo "  ✅ FOCUS speedup: ${FOCUS_SPEEDUP}x"
    fi
fi

# Generate summary
echo ""
echo "📈 KPI Summary:"
echo "==============="

if [ $FAILED -eq 0 ]; then
    echo "✅ All KPIs passed!"
    echo ""
    echo "Performance targets met:"
    echo "  • Memory operations < 100μs"
    echo "  • Snapshots < 5ms"
    echo "  • System ready for production"
    exit 0
else
    echo "❌ KPI gate FAILED"
    echo ""
    echo "Performance improvements needed before merge."
    echo "Tips:"
    echo "  • Profile with 'cargo flamegraph'"
    echo "  • Check for unnecessary allocations"
    echo "  • Consider using arena allocators"
    echo "  • Ensure release build optimizations"
    exit 1
fi