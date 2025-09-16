#!/bin/bash

# pcta-batch.sh - Batch runner for PCTA testing across multiple repos
#
# Usage: ./pcta-batch.sh targets.txt
#        ./pcta-batch.sh --single owner/repo

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOADER_PATH="$PROJECT_ROOT/packages/loader/index.mjs"
ORACLE_PATH="$PROJECT_ROOT/packages/pl-oracle/index.js"
LINT_PATH="$PROJECT_ROOT/packages/pl-receipt-lint/cli.js"

WORK_DIR="/tmp/pcta-batch-$$"
RESULTS_DIR="$PROJECT_ROOT/playground/results"
SCOREBOARD="$PROJECT_ROOT/playground/SCOREBOARD.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Initialize
mkdir -p "$WORK_DIR" "$RESULTS_DIR"

# Functions
log() {
    echo -e "${GREEN}[PCTA]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test single repository
test_repo() {
    local repo=$1
    local owner=$(echo $repo | cut -d'/' -f1)
    local name=$(echo $repo | cut -d'/' -f2)
    local repo_dir="$WORK_DIR/$name"
    local result_file="$RESULTS_DIR/${owner}-${name}.json"

    log "Testing $repo..."

    # Clone
    if [ ! -d "$repo_dir" ]; then
        log "  Cloning..."
        git clone --depth=1 "https://github.com/$repo.git" "$repo_dir" 2>/dev/null || {
            error "  Failed to clone $repo"
            return 1
        }
    fi

    cd "$repo_dir"

    # Install dependencies
    if [ -f "package.json" ]; then
        log "  Installing dependencies..."
        npm install --silent 2>/dev/null || {
            warning "  Failed to install dependencies"
        }
    fi

    # Find test command
    local test_cmd=""
    if [ -f "package.json" ]; then
        test_cmd=$(node -e "
            const pkg = require('./package.json');
            const scripts = pkg.scripts || {};
            if (scripts.test) console.log('npm test');
            else if (scripts['test:unit']) console.log('npm run test:unit');
            else console.log('');
        ")
    fi

    if [ -z "$test_cmd" ]; then
        warning "  No test command found"
        return 1
    fi

    log "  Running baseline tests..."
    local baseline_start=$(date +%s)

    # Run baseline
    timeout 300 $test_cmd > baseline.log 2>&1 || {
        warning "  Baseline tests failed or timed out"
    }

    local baseline_end=$(date +%s)
    local baseline_time=$((baseline_end - baseline_start))

    # Count passed tests
    local baseline_passed=$(grep -E "(✓|✔|passed|PASS)" baseline.log | wc -l | tr -d ' ')

    log "  Running with Pure Lambda loader..."

    # Clean receipts
    rm -rf .pl/receipts
    mkdir -p .pl/receipts

    # Run with loader
    local pl_start=$(date +%s)

    # Detect test runner and use appropriate loader
    if grep -q "vitest" package.json; then
        timeout 300 node --loader="$LOADER_PATH" node_modules/.bin/vitest run --silent > pl.log 2>&1 || true
    elif grep -q "jest" package.json; then
        timeout 300 node --loader="$LOADER_PATH" node_modules/.bin/jest --silent > pl.log 2>&1 || true
    else
        timeout 300 node --loader="$LOADER_PATH" $(which npm) test > pl.log 2>&1 || true
    fi

    local pl_end=$(date +%s)
    local pl_time=$((pl_end - pl_start))

    # Count passed tests with PL
    local pl_passed=$(grep -E "(✓|✔|passed|PASS)" pl.log | wc -l | tr -d ' ')

    # Analyze receipts
    local receipt_count=$(ls -1 .pl/receipts/*.json 2>/dev/null | wc -l | tr -d ' ')
    local cache_hits=0
    local cache_total=0

    if [ "$receipt_count" -gt 0 ]; then
        # Extract stats from receipts
        cache_hits=$(grep -h "cache_hits" .pl/receipts/*.json | sed 's/.*"cache_hits"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/' | awk '{s+=$1} END {print s}')
        cache_total=$(grep -h "total_calls" .pl/receipts/*.json | sed 's/.*"total_calls"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/' | awk '{s+=$1} END {print s}')
    fi

    # Calculate metrics
    local speedup=1
    if [ "$pl_time" -gt 0 ]; then
        speedup=$(echo "scale=2; $baseline_time / $pl_time" | bc 2>/dev/null || echo "1")
    fi

    local improvement=$(echo "scale=1; (($baseline_time - $pl_time) * 100) / $baseline_time" | bc 2>/dev/null || echo "0")
    local cache_rate=0
    if [ "$cache_total" -gt 0 ]; then
        cache_rate=$(echo "scale=1; ($cache_hits * 100) / $cache_total" | bc 2>/dev/null || echo "0")
    fi

    # Validate receipts
    local receipt_status="❓"
    if [ "$receipt_count" -gt 0 ]; then
        if node "$LINT_PATH" .pl/receipts > /dev/null 2>&1; then
            receipt_status="✅"
        else
            receipt_status="⚠️"
        fi
    fi

    # Generate result
    cat > "$result_file" <<EOF
{
  "repo": "$repo",
  "timestamp": $(date +%s),
  "baseline": {
    "time_seconds": $baseline_time,
    "tests_passed": $baseline_passed
  },
  "optimized": {
    "time_seconds": $pl_time,
    "tests_passed": $pl_passed
  },
  "metrics": {
    "speedup": $speedup,
    "improvement_percent": $improvement,
    "cache_rate_percent": $cache_rate,
    "receipts_generated": $receipt_count
  },
  "validation": {
    "tests_match": $([ "$baseline_passed" = "$pl_passed" ] && echo "true" || echo "false"),
    "receipts_valid": "$receipt_status"
  }
}
EOF

    # Output summary
    echo ""
    echo "  ======================================="
    echo "  Repository: $repo"
    echo "  Baseline:   ${baseline_time}s ($baseline_passed tests)"
    echo "  Optimized:  ${pl_time}s ($pl_passed tests)"
    echo "  Speedup:    ${speedup}x (${improvement}% faster)"
    echo "  Cache Rate: ${cache_rate}%"
    echo "  Receipts:   $receipt_count generated $receipt_status"
    echo "  ======================================="
    echo ""

    # Copy best receipts
    if [ "$receipt_count" -gt 0 ]; then
        mkdir -p "$RESULTS_DIR/receipts/${owner}-${name}"
        cp .pl/receipts/*.json "$RESULTS_DIR/receipts/${owner}-${name}/" 2>/dev/null || true
    fi

    cd "$SCRIPT_DIR"
    return 0
}

# Update scoreboard
update_scoreboard() {
    log "Updating scoreboard..."

    cat > "$SCOREBOARD" <<'EOF'
# 🎯 PCTA Battle Scoreboard

*Live results from Pure Lambda infiltration*

## 📊 Summary

EOF

    local total_repos=0
    local successful=0
    local total_speedup=0

    # Process results
    for result_file in "$RESULTS_DIR"/*.json; do
        [ -f "$result_file" ] || continue

        total_repos=$((total_repos + 1))

        local repo=$(jq -r '.repo' "$result_file")
        local speedup=$(jq -r '.metrics.speedup' "$result_file")
        local improvement=$(jq -r '.metrics.improvement_percent' "$result_file")
        local cache_rate=$(jq -r '.metrics.cache_rate_percent' "$result_file")
        local receipts=$(jq -r '.metrics.receipts_generated' "$result_file")
        local valid=$(jq -r '.validation.receipts_valid' "$result_file")

        if [ "$(echo "$speedup > 1" | bc)" = "1" ]; then
            successful=$((successful + 1))
            total_speedup=$(echo "$total_speedup + $speedup" | bc)
        fi
    done

    local avg_speedup=1
    if [ "$successful" -gt 0 ]; then
        avg_speedup=$(echo "scale=2; $total_speedup / $successful" | bc)
    fi

    cat >> "$SCOREBOARD" <<EOF
- **Repositories Tested**: $total_repos
- **Successful Accelerations**: $successful
- **Average Speedup**: ${avg_speedup}x
- **Success Rate**: $(echo "scale=1; ($successful * 100) / $total_repos" | bc 2>/dev/null || echo "0")%

## 🏆 Results Table

| Repository | Baseline | Optimized | Speedup | Cache Rate | Receipts | Status |
|------------|----------|-----------|---------|------------|----------|--------|
EOF

    # Add table rows
    for result_file in "$RESULTS_DIR"/*.json; do
        [ -f "$result_file" ] || continue

        local repo=$(jq -r '.repo' "$result_file")
        local baseline=$(jq -r '.baseline.time_seconds' "$result_file")
        local optimized=$(jq -r '.optimized.time_seconds' "$result_file")
        local speedup=$(jq -r '.metrics.speedup' "$result_file")
        local cache_rate=$(jq -r '.metrics.cache_rate_percent' "$result_file")
        local receipts=$(jq -r '.metrics.receipts_generated' "$result_file")
        local valid=$(jq -r '.validation.receipts_valid' "$result_file")

        local status="🔴"
        if [ "$(echo "$speedup > 1.2" | bc)" = "1" ]; then
            status="🟢"
        elif [ "$(echo "$speedup > 1" | bc)" = "1" ]; then
            status="🟡"
        fi

        echo "| [$repo](https://github.com/$repo) | ${baseline}s | ${optimized}s | **${speedup}x** | ${cache_rate}% | $receipts $valid | $status |" >> "$SCOREBOARD"
    done

    cat >> "$SCOREBOARD" <<'EOF'

## 📈 Next Steps

1. Repositories with 🟢 status → Ready for PR-A (CI canary)
2. Repositories with 🟡 status → Need tuning
3. Repositories with 🔴 status → Investigate issues

## 🔗 Links

- [PR Template A](../templates/PR-A-ci-canary.md) - CI-only acceleration
- [PR Template B](../templates/PR-B-react-canary.md) - React optimization
- [Receipt Validator](../packages/pl-receipt-lint/) - Check receipt validity

---

*Last updated: $(date)*
EOF

    log "Scoreboard updated: $SCOREBOARD"
}

# Main
main() {
    if [ "$1" = "--single" ]; then
        # Test single repo
        shift
        test_repo "$1"
        update_scoreboard
    elif [ -f "$1" ]; then
        # Test from file
        log "Reading targets from $1"
        while IFS= read -r repo; do
            # Skip comments and empty lines
            [[ "$repo" =~ ^#.*$ ]] && continue
            [ -z "$repo" ] && continue

            test_repo "$repo" || warning "Failed to test $repo"
        done < "$1"
        update_scoreboard
    else
        echo "Usage: $0 targets.txt"
        echo "       $0 --single owner/repo"
        exit 1
    fi

    # Cleanup
    rm -rf "$WORK_DIR"

    log "Complete! Results in $RESULTS_DIR"
    log "Scoreboard: $SCOREBOARD"
}

main "$@"