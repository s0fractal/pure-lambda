# 🔀 Merge Policy & Batch Operations

## Quick Commands

```bash
# Safe batch merge of all green PRs
make merge-green

# Preflight check before manual merge
make preflight-check

# Check current gate status
cat reports/dashboard/gate.json | jq '.status'
```

## GO/NO-GO Rules

### ✅ AUTO-MERGE (Green Lane)
Safe to merge automatically if:
- CI passes all checks
- DSSE = 100%
- BIOLOCK clean
- Dedupe clean
- Coverage maintained at 12/12
- NO changes to: `policies/**`, `oracle/**`, `scripts/policy/**`
- Has label `auto-merge:green` OR `mergeStateStatus=="CLEAN"`

### ⚠️ HOLD (Requires Review)
Need manual review if:
- Changes governance/orchestration code
- Modifies critical Makefile targets
- Alters LoA promotion criteria
- Touches expansion/contraction logic

### ❌ BLOCK (Requires Quorum)
Need 2-of-3 DID approval for:
- Policy changes
- LoA level modifications
- Epsilon limit adjustments
- Safety threshold changes

## Batch Merge Process

1. **Update Metrics**
   ```bash
   make metrics-refresh
   ```

2. **Verify Gate Status**
   ```bash
   # Must show GREEN or GO
   jq -r '.status' reports/dashboard/gate.json
   ```

3. **Find Mergeable PRs**
   ```bash
   gh pr list -B master -s open -L 100 --json number,title,mergeStateStatus
   ```

4. **Execute Batch Merge**
   ```bash
   make merge-green
   ```

## Preflight Checks for Uncertain PRs

```bash
# Test merge in isolated worktree
git worktree add ../premerge master
cd ../premerge

# For each branch to test
BRANCH=feature/xyz
git checkout master
git merge --no-commit --no-ff origin/$BRANCH

# Run quality checks
npm run ck:validate
make preflight-check

# If all pass, abort test merge and add label
git merge --abort
gh pr edit $PR_NUMBER --add-label auto-merge:green
```

## Post-Merge Monitoring

After batch merge:
1. Daily workflows trigger automatically
2. Gate remains GREEN if metrics hold
3. Canary expansions continue per schedule
4. Monitor dashboard: `make go-live`

## Emergency Rollback

If metrics degrade after merge:
```bash
# Immediate contraction
make contract-lite

# Demote to LoA2
make loa3-demote

# Find problematic commit
git bisect start
git bisect bad HEAD
git bisect good HEAD~10
# Test each with: make preflight-check
```

## Label Management

```bash
# Add auto-merge label to safe PR
gh pr edit $PR_NUMBER --add-label auto-merge:green

# Remove from risky PR
gh pr edit $PR_NUMBER --remove-label auto-merge:green

# List PRs with label
gh pr list -l auto-merge:green
```

## Automation via GitHub Actions

Create `.github/workflows/auto-merge.yml`:
```yaml
name: Auto Merge Green PRs
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  merge:
    if: github.repository == 's0fractal/pure-lambda'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: make preflight-check
      - run: make merge-green
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---
*Safe batch merging with quality gates*