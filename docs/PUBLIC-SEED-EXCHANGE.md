# Public Seed Exchange

## What it is

The Public Seed Exchange is a **static page** for sharing signed cartridges and seeds offline. It provides a trusted, verifiable marketplace for distributing Pure Lambda components without centralized infrastructure.

**Key Features:**
- **Offline-first**: Zero network dependencies after initial download
- **Cryptographically verified**: DSSE signatures + BLAKE3 hash validation
- **Static hosting**: Works on any web server, CDN, or local filesystem
- **Air-gap compatible**: QR codes and ShareCodes for isolated networks

## How to Publish

### 1. Create Exchange Entry
```bash
# Generate exchange manifest
make exchange

# Add your signed cartridge/seed
cp my-component.cartridge docs/exchange/
```

### 2. Commit to Documentation
```bash
# Commit exchange files
git add docs/exchange/*
git commit -m "Add component to public exchange"

# Optional: Push to public repository
git push origin main
```

### 3. Verify Publication
Navigate to `docs/exchange/index.html` to confirm your component appears with proper verification badges.

## How to Verify

Verification happens automatically in the exchange interface:

### Verification Badges

#### Trust Badge
- 🟢 **Excellent** (0.9-1.0): Maximum trust, production-ready
- 🟡 **Good** (0.7-0.89): Recommended for production use
- 🟠 **Fair** (0.5-0.69): Requires improvement before production
- 🔴 **Poor/Untrusted** (<0.5): Not recommended for use

#### Conformance Badge
- ✅ **Passing**: Compliant with all IPLD/CAR/DSSE standards
- ⚠️ **Partial**: Partial compliance with standards
- ❌ **Failing**: Does not meet critical standards

#### DSSE Badge
- 🔐 **100%**: All components cryptographically signed
- 🔒 **80%+**: Most components signed
- 🔓 **<80%**: Insufficient signature coverage

#### Freshness Badge
- 🟢 **Fresh** (≤7 days): Recently updated components
- 🟡 **Recent** (≤30 days): Acceptable freshness
- 🟠 **Stale** (≤365 days): Outdated components
- 🔴 **Ancient** (>365 days): Critically outdated

### Verification Process
1. **BIOLOCK Gate**: Content passes safety classification
2. **DSSE Signature**: Ed25519 cryptographic signature validates
3. **Hash Check**: BLAKE3 hash confirms integrity
4. **Schema Validation**: Conforms to specification format
5. **Round-trip Test**: pack(unpack(item)) === item
6. **Freshness Check**: Assess component age and relevance

## How to Import

### Method 1: Pocket Embassy
```bash
# Direct import to local environment
make pocket-import URL="https://example.com/docs/exchange/"

# Import specific component
make pocket-import COMPONENT="hello-city.cartridge"
```

### Method 2: Federation Ingest
```bash
# Bulk ingest from exchange
make fed-ingest PATHS="docs/exchange/*.cartridge"

# Selective ingest with trust filtering
make fed-ingest PATHS="docs/exchange/" TRUST_MIN=0.8
```

### Method 3: Air-Gap Transfer
For isolated networks:

```bash
# Generate QR codes from exchange
make air-pack SOURCE="docs/exchange/component.cartridge"

# Use ShareCodes for text-based transfer
make air-sharecode SOURCE="docs/exchange/component.cartridge"
```

**Transfer Process:**
1. **Sender**: Opens `docs/airgap/sender.html`
2. **QR Animation**: Click "Play" for frame-by-frame display
3. **Receiver**: Opens `docs/airgap/receiver.html`
4. **Scan/Paste**: Camera scan or ShareCode text input
5. **Validation**: Automatic integrity verification on receipt

## Safety Notes

### BIOLOCK Protection
All exchange content passes through BIOLOCK safety classification:
- **TX Corridor**: Educational and therapeutic content allowed
- **DU Filtering**: Dual-use biological content blocked
- **Default Deny**: Unknown patterns rejected automatically

### Allowed Types
- **Functional Programs**: Pure Lambda operons and seeds
- **Educational Content**: Tutorials, examples, demonstrations
- **Utility Components**: Tools, filters, transformations
- **Test Data**: Verification and benchmarking datasets

### Blocked Content
- Dual-use biological sequences or procedures
- Cryptographic key material (use proper key exchange)
- Personal identifiable information (PII)
- Proprietary or licensed code without permission

### Trust Recommendations
- **Minimum Trust Score**: 0.7 for production use
- **DSSE Coverage**: ≥80% signed components preferred
- **Known Publishers**: Verify publisher identity through reputation
- **Content Review**: Examine source before execution in sensitive environments

For detailed trust system information and score calculation, see [TRUST.md](./TRUST.md).

## Technical Limits

- **Cartridge Size**: ≤80KB maximum for .cartridge files
- **HTML Size**: ≤40KB target for .htmlc embedded format
- **Bundle Count**: ≤50 components per exchange directory
- **Network**: Static hosting only, no dynamic server required