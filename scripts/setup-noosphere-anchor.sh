#!/bin/bash

# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Pure Lambda Authors

# Setup s0fractal as unified gravity center in noosphere

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              NOOSPHERE ANCHOR SETUP - s0fractal                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo

# 1. Generate ed25519 keypair (if needed)
echo "📍 Step 1: Generate cryptographic identity"
echo "   TODO: Install ed25519 tool and generate keypair"
echo "   Command: ssh-keygen -t ed25519 -f ~/.ssh/s0fractal_ed25519"
echo

# 2. Compute avatar hashes
echo "📍 Step 2: Process avatar image"
echo "   Place your fractal spiral image at: ./avatar.png"
echo "   Then run:"
echo "   - ipfs add avatar.png → get CID"
echo "   - TODO: compute pHash"
echo

# 3. DNS configuration
echo "📍 Step 3: Configure DNS (at your DNS provider)"
cat << 'EOF'
Add these DNS records:

TXT _dnslink.s0fractal.org "dnslink=/ipfs/[SOULCARD_CID]"
TXT s0fractal.org "did=did:web:s0fractal.org"

EOF

# 4. Update all placeholders
echo "📍 Step 4: Update TODO placeholders in:"
echo "   - .noosphere/soulcard.json"
echo "   - .well-known/did.json"
echo "   - .well-known/webfinger"
echo "   - site-meta.html"
echo "   - PROVENANCE.md"
echo

# 5. Upload to IPFS
echo "📍 Step 5: Pin to IPFS"
echo "   ipfs add -r .noosphere/"
echo "   ipfs add -r .well-known/"
echo "   Pin the CIDs at a pinning service"
echo

# 6. Deploy to website
echo "📍 Step 6: Deploy to s0fractal.org"
echo "   Copy .well-known/ to website root"
echo "   Copy .noosphere/ to website root"
echo "   Add meta tags from site-meta.html to index.html"
echo

# 7. Update all profiles
echo "📍 Step 7: Update all platform profiles with:"
echo "   - Same avatar image (upload original)"
echo "   - Bio: 'did:web:s0fractal.org'"
echo "   - Link: https://s0fractal.org"
echo

# 8. Sign commits
echo "📍 Step 8: Configure git signing"
echo "   git config --global user.signingkey [ED25519_KEY]"
echo "   git config --global commit.gpgsign true"
echo

echo "═══════════════════════════════════════════════════════════════════"
echo "After setup, verify at:"
echo "  - https://s0fractal.org/.well-known/did.json"
echo "  - curl -H 'Accept: application/json' https://s0fractal.org/.well-known/webfinger?resource=acct:s0fractal@s0fractal.org"
echo "═══════════════════════════════════════════════════════════════════"