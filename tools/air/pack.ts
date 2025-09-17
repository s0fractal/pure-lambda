#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// BLAKE3 implementation (simplified - in production would use proper BLAKE3)
function blake3(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Base32 encoding (RFC 4648)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(data: Uint8Array): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return result;
}

// CRC16-CCITT implementation
function crc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

// Simple CBOR encoder for basic objects
function encodeCBOR(obj: any): Uint8Array {
  const result: number[] = [];

  function encodeValue(value: any) {
    if (typeof value === 'string') {
      const utf8 = new TextEncoder().encode(value);
      if (utf8.length < 24) {
        result.push(0x60 | utf8.length);
      } else {
        result.push(0x78, utf8.length);
      }
      result.push(...utf8);
    } else if (typeof value === 'number') {
      if (value < 24) {
        result.push(value);
      } else if (value < 256) {
        result.push(0x18, value);
      } else {
        result.push(0x19, value >> 8, value & 0xFF);
      }
    } else if (value instanceof Uint8Array) {
      if (value.length < 24) {
        result.push(0x40 | value.length);
      } else {
        result.push(0x58, value.length);
      }
      result.push(...value);
    } else if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value);
      if (keys.length < 24) {
        result.push(0xA0 | keys.length);
      } else {
        result.push(0xB8, keys.length);
      }
      for (const key of keys) {
        encodeValue(key);
        encodeValue(value[key]);
      }
    }
  }

  encodeValue(obj);
  return new Uint8Array(result);
}

// Simple Base45 encoder (fallback to Base32 if needed)
function base45Encode(data: Uint8Array): string {
  // For this implementation, we'll use Base32 as fallback
  return base32Encode(data);
}

// SVG QR code generator (minimal implementation)
function generateQRSVG(data: string, size: number = 200): string {
  // This is a minimal placeholder - in production would use proper QR library
  const modules = Math.ceil(Math.sqrt(data.length / 3)) + 10; // Estimate modules needed
  const moduleSize = size / modules;

  let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${size}" height="${size}" fill="white"/>`;

  // Generate a deterministic pattern based on data hash
  const hash = crypto.createHash('sha256').update(data).digest();
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      const index = (y * modules + x) % hash.length;
      if (hash[index]! % 2 === 0) {
        const px = x * moduleSize;
        const py = y * moduleSize;
        svg += `<rect x="${px}" y="${py}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }

  // Embed payload as metadata
  svg += `<!-- PL-AIR-01 Frame Data: ${data} -->`;
  svg += '</svg>';

  return svg;
}

interface Header {
  magic: string;
  version: number;
  name: string;
  mime: string;
  size: number;
  blake3hex: string;
  chunkSize: number;
  chunks: number;
  parityEvery?: number;
}

interface Frame {
  header?: Header;
  chunkIndex: number;
  chunkData: Uint8Array;
}

function getAllowedExtensions(): string[] {
  return ['.htmlc', '.cartridge', '.seed.json', '.fed.zip'];
}

function getMimeType(ext: string): string {
  switch (ext) {
    case '.htmlc': return 'text/html';
    case '.cartridge': return 'application/octet-stream';
    case '.seed.json': return 'application/json';
    case '.fed.zip': return 'application/zip';
    default: return 'application/octet-stream';
  }
}

function scanForBIOLOCK(filePath: string, content: Buffer): void {
  if (!filePath.endsWith('.seed.json')) return;

  const text = content.toString('utf8');
  const forbiddenTokens = [
    'eval(',
    'Function(',
    'setTimeout(',
    'setInterval(',
    'XMLHttpRequest',
    'fetch(',
    '__proto__',
    'constructor',
    'prototype'
  ];

  for (const token of forbiddenTokens) {
    if (text.includes(token)) {
      throw new Error(`BIOLOCK: Forbidden token detected: ${token}`);
    }
  }
}

async function packFile(filePath: string, chunkSize: number = 900, parityEvery: number = 16): Promise<void> {
  // Validate file extension
  const ext = path.extname(filePath);
  const allowedExts = getAllowedExtensions();
  if (!allowedExts.includes(ext)) {
    throw new Error(`File extension ${ext} not allowed. Permitted: ${allowedExts.join(', ')}`);
  }

  // Read and validate file
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const mimeType = getMimeType(ext);

  // BIOLOCK scan
  scanForBIOLOCK(filePath, fileContent);

  // Compute BLAKE3 hash
  const blake3hex = blake3(fileContent);

  // Calculate chunks
  const totalChunks = Math.ceil(fileContent.length / chunkSize);

  // Create header
  const header: Header = {
    magic: 'PLAIR01',
    version: 1,
    name: fileName,
    mime: mimeType,
    size: fileContent.length,
    blake3hex,
    chunkSize,
    chunks: totalChunks
  };

  if (parityEvery > 0) {
    header.parityEvery = parityEvery;
  }

  // Ensure output directories exist
  const distAir = path.join(process.cwd(), 'dist', 'air');
  const qrDir = path.join(distAir, 'qrs');
  fs.mkdirSync(distAir, { recursive: true });
  fs.mkdirSync(qrDir, { recursive: true });

  // Generate frames
  const frames: Frame[] = [];
  const sharecodes: string[] = [];

  // Frame 0: Header + first chunk
  const firstChunk = fileContent.slice(0, chunkSize);
  const frame0: Frame = {
    header,
    chunkIndex: 0,
    chunkData: firstChunk
  };
  frames.push(frame0);

  // Remaining data frames
  for (let i = 1; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, fileContent.length);
    const chunk = fileContent.slice(start, end);

    const frame: Frame = {
      chunkIndex: i,
      chunkData: chunk
    };
    frames.push(frame);
  }

  // Generate parity frames if enabled
  if (header.parityEvery && header.parityEvery > 0) {
    for (let i = 0; i < totalChunks; i += header.parityEvery) {
      const endIdx = Math.min(i + header.parityEvery, totalChunks);
      const parityData = new Uint8Array(chunkSize);

      // XOR all chunks in this interval
      for (let j = i; j < endIdx; j++) {
        const chunkData = frames[j]!.chunkData;
        for (let k = 0; k < Math.min(chunkData.length, parityData.length); k++) {
          parityData[k]! ^= chunkData[k]!;
        }
      }

      const parityFrame: Frame = {
        chunkIndex: totalChunks + Math.floor(i / header.parityEvery!),
        chunkData: parityData
      };
      frames.push(parityFrame);
    }
  }

  // Generate QR codes and ShareCodes
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const cborData = encodeCBOR(frame);
    const base45Data = base45Encode(cborData);

    // Generate QR SVG
    const qrSvg = generateQRSVG(base45Data);
    const qrFileName = `frame-${(i + 1).toString().padStart(4, '0')}.svg`;
    fs.writeFileSync(path.join(qrDir, qrFileName), qrSvg);

    // Generate ShareCode
    const shareCodeData = base32Encode(cborData);
    const crc = crc16(shareCodeData);
    const shareCode = `${(i + 1).toString().padStart(3, '0')}/${frames.length.toString().padStart(3, '0')} ${shareCodeData}*${crc}*`;
    sharecodes.push(shareCode);
  }

  // Write manifest
  const manifest = {
    header,
    stats: {
      totalFrames: frames.length,
      dataFrames: totalChunks,
      parityFrames: header.parityEvery ? Math.ceil(totalChunks / header.parityEvery) : 0,
      totalSize: fileContent.length,
      estimatedQRs: frames.length
    }
  };

  fs.writeFileSync(path.join(distAir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Write ShareCodes
  fs.writeFileSync(path.join(distAir, 'sharecodes.txt'), sharecodes.join('\n'));

  console.log(`✅ Packed ${fileName} into ${frames.length} frames`);
  console.log(`📁 Output: dist/air/manifest.json, dist/air/sharecodes.txt, dist/air/qrs/`);
  console.log(`📊 Data frames: ${totalChunks}, Parity frames: ${frames.length - totalChunks}`);
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const filePath = args[0] || 'dist/release/hello-city.cartridge';

  let chunkSize = 900;
  let parityEvery = 16;

  // Parse options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg && arg.startsWith('--chunk=')) {
      chunkSize = parseInt(arg.split('=')[1]!);
    } else if (arg && arg.startsWith('--parity=')) {
      parityEvery = parseInt(arg.split('=')[1]!);
    }
  }

  packFile(filePath, chunkSize, parityEvery).catch((error) => {
    console.error('❌ Pack failed:', error.message);
    process.exit(1);
  });
}