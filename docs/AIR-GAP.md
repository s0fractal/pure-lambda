# Air-Gap Exchange

## What it is

Air-gap exchange enables secure transfer of cartridges and federation bundles across isolated networks using QR codes or ShareCodes. Built on the PL-AIR-01 protocol, it provides cryptographic integrity verification and optional parity recovery for reliable offline transfers.

## Two Transfer Modes

### QR Frames (Camera Transfer)
- **Visual transfer**: Camera-based scanning of animated QR sequences
- **Frame rate**: 2-6 FPS for manual scanning
- **Encoding**: Base45/Base32 encoding of CBOR frames
- **Best for**: Quick transfers, mobile device capture

### ShareCodes (Copy/Paste Transfer)
- **Text transfer**: Copy/paste of Base32-encoded blocks
- **Format**: `001/150 ABCDEFGH...234567*A1B2*`
- **Verification**: CRC16-CCITT checksums prevent typos
- **Best for**: Terminal environments, network isolation

## Service Level Objectives (SLOs)

### Without Parity
- **Success rate**: ≥99% for complete transfers
- **Failure mode**: Any missing frame requires full retransmission

### With Parity (parityEvery=16)
- **Tolerance**: 1 lost frame per 16-frame block
- **Recovery**: Automatic reconstruction of missing chunks
- **Recommended**: For unreliable scanning conditions

## Transfer Workflow

### Step 1: Pack the File
```bash
make air-pack
# Default: packs dist/release/hello-city.cartridge
# Custom: make air-pack FILE=path/to/file.cartridge
```

### Step 2: Send via QR Frames
```bash
make air-sender
# Opens sender.html in browser
# Click "Play" to start QR animation
# Scan sequence with receiving device
```

### Step 3: Receive and Download
```bash
make air-receiver
# Opens receiver.html in browser
# Click "Scan" for camera capture
# Or paste ShareCodes manually
# Click "Download" when complete
```

### Step 4: Ingest into Federation
```bash
make fed-ingest PATHS="dist/air/out/<filename>"
# Validates and imports received files
# Adds to federation bundle for distribution
```

## Troubleshooting

### Low-Resolution Screens
Increase chunk size for fewer, larger QR codes:
```bash
ts-node tools/air/pack.ts file.cartridge --chunk=700
```

### Scanning Issues
- **Lower frame rate**: Manually advance frames
- **Poor lighting**: Use ShareCodes instead
- **Small screens**: Increase browser zoom to 150-200%

### Transfer Failures
1. **Missing frames**: Check frame counter in UI
2. **Parity enabled**: System auto-recovers single lost frames
3. **Corruption detected**: BLAKE3 hash mismatch requires retransmission
4. **Invalid file type**: Only .htmlc, .cartridge, .seed.json, .fed.zip allowed

### ShareCode Mode
- **Copy errors**: CRC checksum detects typos
- **Missing blocks**: Receiver shows progress counter
- **Large files**: Split into multiple sessions if needed

## File Type Support

- **.htmlc**: HTML Cartridge files
- **.cartridge**: Pure Lambda cartridge packages
- **.seed.json**: Seed configuration files (BIOLOCK scanned)
- **.fed.zip**: Federation distribution bundles

## Security Features

- **BLAKE3 integrity**: End-to-end file verification
- **BIOLOCK scanning**: Prevents malicious seed transfers
- **Sandboxed output**: Files write only to `dist/air/out/`
- **Allowlist enforcement**: Restricted file type validation

## Performance Notes

- **Typical cartridge (~5KB)**: 30-200 frames, ~1-2 minute transfer
- **Chunk size**: 900 bytes default (optimized for QR capacity)
- **Parity overhead**: ~6% additional frames for recovery capability
- **Assembly speed**: <2 seconds reconstruction for typical bundles