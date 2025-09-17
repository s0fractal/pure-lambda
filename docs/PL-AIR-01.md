# PL-AIR-01: Air-Gap Exchange Protocol

## Overview

PL-AIR-01 defines a deterministic protocol for transferring files across air-gapped environments using QR codes and ShareCodes. The protocol ensures data integrity through cryptographic hashing and optional parity recovery.

## Magic Identifier
```
PLAIR01
```

## Frame Structure

### Header (Frame #0 only)
```typescript
interface Header {
  magic: string;        // "PLAIR01"
  version: number;      // 1
  name: string;         // Original filename
  mime: string;         // MIME type
  size: number;         // File size in bytes
  blake3hex: string;    // BLAKE3 hash (hex)
  chunkSize: number;    // Chunk size in bytes
  chunks: number;       // Total number of chunks
  parityEvery?: number; // Optional parity interval (default: 16)
}
```

### Frame Format
```typescript
interface Frame {
  header?: Header;      // Only present in frame #0
  chunkIndex: number;   // 0-based chunk index
  chunkData: Uint8Array; // Chunk payload or parity data
}
```

## Encodings

### QR Code Encoding
- **Primary**: Base45 encoding of CBOR(Frame)
- **Fallback**: Base32 encoding if Base45 unavailable
- **Format**: Deterministic SVG with auto-fit QR version
- **Payload Limit**: ~900 bytes (optimized for QR capacity)

### ShareCode Encoding
- **Format**: Base32 groups of 32 characters
- **Suffix**: CRC16-CCITT checksum in format `*XXXX*`
- **Layout**: `INDEX/TOTAL SPACE CODE*XXXX*`

Example:
```
001/150 ABCDEFGHIJKLMNOPQRSTUVWXYZ234567*A1B2*
002/150 890ABCDEFGHIJKLMNOPQRSTUVWXYZ2345*C3D4*
```

## Integrity Protection

### File-Level Integrity
- **Algorithm**: BLAKE3 hash of complete file
- **Verification**: Required before reconstruction output

### Optional Parity Recovery
- **Interval**: Every 16 chunks (configurable)
- **Algorithm**: Simple XOR parity across chunk interval
- **Recovery**: Allows reconstruction of single missing chunk per interval

## Allowed File Types

The protocol restricts transfer to specific file extensions for security:

- `.htmlc` - HTML Cartridge files
- `.cartridge` - Pure Lambda cartridge files
- `.seed.json` - Seed configuration files
- `.fed.zip` - Federation bundle files

## BIOLOCK Integration

For `.seed.json` files, the system performs BIOLOCK scanning to detect and prevent transfer of files containing forbidden tokens or potentially malicious content.

## Security Considerations

1. **Allowlist Enforcement**: Only permitted file extensions are processed
2. **Content Scanning**: BIOLOCK validation for seed files
3. **Sandboxed Output**: Reconstruction writes only to `dist/air/out/` directory
4. **Integrity Verification**: BLAKE3 validation before file output
5. **Fail-Safe**: Any integrity failure results in non-zero exit code

## Implementation Requirements

### Deterministic Behavior
- Frame generation must be reproducible
- QR SVG output must be identical across runs
- ShareCode generation must follow consistent formatting

### Error Handling
- Missing chunks detected and reported
- Parity validation and recovery attempted when available
- Complete workflow must exit with non-zero code on any failure

### Performance Targets
- **Pack**: Process typical cartridge files (~5KB) in <1 second
- **Assemble**: Reconstruct from 30-200 frames in <2 seconds
- **UI**: Frame display at 2-6 FPS for manual transfer