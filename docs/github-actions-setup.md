# GitHub Actions Configuration for LoA3

## Required Settings
Navigate to: **Settings → Actions → General**

### 1. Actions Permissions
- [x] **Allow all actions and reusable workflows**

### 2. Workflow Permissions
- [x] **Read and write permissions**
- [x] **Allow GitHub Actions to create and approve pull requests** ✅

### 3. Repository Secrets
**Settings → Secrets and variables → Actions**

Required secrets:
```bash
# Generate ED25519 key pair
openssl genpkey -algorithm ED25519 -out private.pem
openssl pkey -in private.pem -out private.txt -text
cat private.pem | base64 > private.b64

# Set via GitHub CLI
gh secret set PL_ED25519_SECRET < private.b64 --repo chaoshex/pure-lambda
gh secret set PL_DID --body "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK" --repo chaoshex/pure-lambda
```

### 4. Branch Protection (Optional)
**Settings → Branches → Add rule**

For `master` branch:
- [ ] Require pull request reviews before merging
- [x] Allow specified actors to bypass: `github-actions[bot]`
- [ ] Require status checks to pass
- [x] Include administrators

## Benefits of These Settings

### With "Allow GitHub Actions to create and approve pull requests":
1. **Automated PR Creation**: Workflows can open PRs for updates
2. **Self-Approval**: Bot can approve its own PRs (if rules allow)
3. **Canary Expansions**: Can create PRs for gradual rollouts
4. **Emergency Rollbacks**: Can auto-revert on failures

### Example Workflow Capabilities:
```yaml
- name: Create PR for expansion
  run: |
    gh pr create \
      --title "🐤 Canary: +1% expansion" \
      --body "Automated by LoA3 oracle" \
      --label "canary" \
      --assignee "@me"

- name: Auto-approve if metrics good
  if: steps.gate.outputs.status == 'GREEN'
  run: |
    gh pr review --approve $PR_NUMBER
    gh pr merge --auto --merge $PR_NUMBER
```

## Security Considerations
- Actions can't bypass branch protection by default
- Requires explicit `GITHUB_TOKEN` permissions in workflow
- All actions are logged in Actions history
- Can set CODEOWNERS for additional review requirements

## Testing the Setup
```bash
# Trigger a test workflow
gh workflow run daily-digest.yml --repo chaoshex/pure-lambda

# Check workflow runs
gh run list --repo chaoshex/pure-lambda

# View specific run
gh run view [RUN_ID] --repo chaoshex/pure-lambda
```

---
*This enables full LoA3 autonomous operation with safety controls*