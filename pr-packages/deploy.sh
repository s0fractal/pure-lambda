#!/bin/bash

# PCTA PR Deployment Script
# Deploy to target repository

set -e

TARGET_REPO=$1
if [ -z "$TARGET_REPO" ]; then
  echo "Usage: ./deploy.sh <org/repo>"
  echo "Example: ./deploy.sh vitejs/vite"
  exit 1
fi

echo "🚀 Deploying PCTA to $TARGET_REPO"

# Extract org and repo name
IFS='/' read -r ORG REPO <<< "$TARGET_REPO"

# Fork the repository
echo "📋 Forking $TARGET_REPO..."
gh repo fork $TARGET_REPO --clone || {
  echo "Fork already exists, cloning..."
  gh repo clone $ORG/$REPO
}

cd $REPO

# Create feature branch
BRANCH="feat/pcta-test-acceleration-$(date +%s)"
git checkout -b $BRANCH

# Copy workflow file
echo "📦 Adding PCTA workflow..."
mkdir -p .github/workflows

# Check if Zod repo (uses yarn)
if [[ "$TARGET_REPO" == *"zod"* ]]; then
  cp ../../.github/workflows/pcta-canary-zod.yml .github/workflows/pcta-canary.yml
else
  cp ../../.github/workflows/pcta-canary.yml .github/workflows/
fi

# Ensure safety flags are set
sed -i.bak 's/ENABLE_PL: 1/ENABLE_PL: 1\n  PL_LOADER_STRICT: 1\n  PL_SEED: auto\n  PL_DISABLE_NET: 1/' .github/workflows/pcta-canary.yml 2>/dev/null ||
sed -i '' 's/ENABLE_PL: 1/ENABLE_PL: 1\n  PL_LOADER_STRICT: 1\n  PL_SEED: auto\n  PL_DISABLE_NET: 1/' .github/workflows/pcta-canary.yml
rm -f .github/workflows/pcta-canary.yml.bak

# Commit changes
git add .github/workflows/pcta-canary.yml
git commit -m "ci: add canary target for test acceleration

- Optional non-blocking CI job
- Cryptographic receipts for equivalence
- Continue-on-error: won't break CI
- Zero code changes"

# Push to fork
echo "📤 Pushing to fork..."
git push origin $BRANCH

# Create pull request
echo "🔗 Creating pull request..."
# Use specific body for Zod if applicable
if [[ "$TARGET_REPO" == *"zod"* ]] && [ -f "../../pr-packages/zod/pr-body.md" ]; then
  BODY_FILE="../../pr-packages/zod/pr-body.md"
else
  BODY_FILE="../../pr-packages/vite/pr-body-refined.md"
fi

gh pr create \
  --repo $TARGET_REPO \
  --head $(gh api user -q .login):$BRANCH \
  --title "CI Canary: Proof-Carrying Test Acceleration (no code changes)" \
  --body-file $BODY_FILE

echo "✅ PR created successfully!"
echo ""
echo "Next steps:"
echo "1. Monitor CI results"
echo "2. Respond to maintainer feedback"
echo "3. Share performance metrics"
echo ""
echo "Track progress at: https://github.com/$TARGET_REPO/pulls"