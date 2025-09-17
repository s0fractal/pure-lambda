# Pocket↔Pocket Direct Transfer

**PL-AIR-01 Compatible • QR-ARQ Protocol • No Cables, No Network**

## What & Why

Pocket Direct enables air-gap transfer between two laptops/devices without:
- Physical cables or USB sticks
- WiFi, Bluetooth, or internet connection
- Complex setup or dependencies

Perfect for:
- **Secure environments** where network access is restricted
- **Conference demos** showing quick seed/cartridge sharing
- **Emergency transfers** when traditional methods fail
- **DSSE-signed content** distribution between isolated machines

Both devices simply run the same HTML file (`direct.htmlc`) in any modern browser.

## How It Works

### Sender Side
1. **Pick Artifact** → Load `.htmlc`, `.cartridge`, `.seed.json`, or `.fed.zip`
2. **Start Send** → File gets chunked with parity blocks (PL-AIR-01 format)
3. **QR Animation** → Display frames at 3-6 fps, sender shows QR codes to receiver
4. **Monitor Progress** → Watch ACK/NAK feedback from receiver camera
5. **Export Receipt** → Generate transfer proof with BLAKE3 + timestamps

### Receiver Side
1. **Start Receive** → Initialize frame collection buffer
2. **Scan QR Codes** → Point camera at sender screen or paste frame data
3. **Auto-Recovery** → Missing frames recovered via XOR parity (1 lost per 16)
4. **Assemble & Verify** → BLAKE3 hash check ensures integrity
5. **Import to Federation** → Auto-generates CLI command for ingestion

## Performance Tips

### Optimal Throughput (5-6 fps)
- **Brightness ↑** → Max screen brightness on sender
- **Camera Focus** → Hold receiver steady 6-12 inches from screen
- **Frame Rate** → Start at 3fps, increase if camera keeps up
- **Lighting** → Minimize glare, avoid direct sunlight

### Resume Support
- **Lost Frames** → Automatic NAK retransmission via ACK/NAK QR
- **Pause/Resume** → Sender can pause transmission anytime
- **ShareCode Mode** → Text fallback for unreliable QR scanning
- **Parity Recovery** → Up to 1 lost frame per 16-frame block

### Troubleshooting
- **Low Success Rate** → Switch to ShareCode mode for manual entry
- **QR Too Dense** → Reduce chunk size to 700B in advanced settings
- **Camera Issues** → Use copy/paste between QR frames and text input

## Safety & Security

### DSSE Preferred
- **Signed Content** → Look for green "DSSE Verified" badges
- **Ed25519 Signatures** → Cryptographic provenance for all transfers
- **Receipt Signing** → Transfer logs include tamper-proof timestamps

### BIOLOCK Protection
- **Type Filtering** → Only `.htmlc`, `.cartridge`, `.seed.json`, `.fed.zip` allowed
- **Size Limits** → ≤60KB for htmlc, ≤80KB for cartridge/federation
- **Hash Validation** → BLAKE3 integrity check on assembly

### Allowed Types
```
✅ .htmlc       → Single-file cartridges (≤40KB recommended)
✅ .cartridge   → Zip-format cartridges (≤80KB)
✅ .seed.json   → Raw PL-SEED-01 format
✅ .fed.zip     → Federation bundles (≤80KB)
❌ .exe/.app    → Executables blocked by BIOLOCK
❌ .zip         → Generic archives require .fed.zip extension
❌ Large files  → Above size limits rejected
```

## Quick Commands

```bash
# Launch direct transfer tool
open docs/pocket/direct.htmlc

# Or serve locally
python3 -m http.server 8000
# Visit: http://localhost:8000/docs/pocket/direct.htmlc

# Auto-ingest received files
make fed-ingest PATHS="dist/air/out/<filename>"
make fed-bundle && make fed-verify

# Verify transfer receipts
./cli/verify-receipt.js --receipt transfer-receipt.json
```

## Technical Specs

- **Protocol**: PL-AIR-01 (QR-ARQ with windowed acknowledgment)
- **Chunk Size**: 900B default (700B for low-res screens)
- **Parity**: XOR blocks every 16 frames
- **Hash**: BLAKE3 for integrity verification
- **Encoding**: Base32 + CRC16-CCITT checksums
- **Resume**: Supported via ACK/NAK protocol
- **Max Size**: 60KB (htmlc) / 80KB (cartridge/federation)

---
*Offline • Deterministic • DSSE-Verified*