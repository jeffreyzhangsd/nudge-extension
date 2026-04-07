#!/usr/bin/env node
// Generates simple solid-color PNG icons for the extension.
// Replace with real artwork when ready — these are functional placeholders.

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// CRC32 needed for valid PNG chunks
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

// RGBA PNG — lets us draw a rounded square with transparent corners
function makePng(size, drawPixel) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 4);
    row[0] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawPixel(x, y, size);
      row[1 + x * 4] = r;
      row[1 + x * 4 + 1] = g;
      row[1 + x * 4 + 2] = b;
      row[1 + x * 4 + 3] = a;
    }
    rows.push(row);
  }

  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function nudgeIcon(x, y, size) {
  const pad = Math.round(size * 0.1);
  const radius = Math.round(size * 0.22);
  const cx = size / 2, cy = size / 2;

  // Rounded-square mask
  const dx = Math.max(0, Math.abs(x - cx + 0.5) - (size / 2 - pad - radius));
  const dy = Math.max(0, Math.abs(y - cy + 0.5) - (size / 2 - pad - radius));
  const inSquare = dx * dx + dy * dy <= radius * radius;
  if (!inSquare) return [0, 0, 0, 0]; // transparent

  // Simple "N" letterform in the middle third
  const nx = (x - pad) / (size - pad * 2); // 0..1
  const ny = (y - pad) / (size - pad * 2);
  const margin = 0.2;
  const strokeW = 0.12;

  const inN =
    (nx >= margin && nx <= margin + strokeW) || // left stem
    (nx >= 1 - margin - strokeW && nx <= 1 - margin) || // right stem
    Math.abs(ny - nx) < strokeW * 0.9; // diagonal (approx)

  const inBounds = nx >= margin && nx <= 1 - margin && ny >= margin && ny <= 1 - margin;

  if (inBounds && inN) return [255, 255, 255, 255]; // white letter
  return [0x18, 0x18, 0x1b, 255]; // zinc-900 background
}

const outDir = join(__dirname, "../public/icons");
mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  writeFileSync(join(outDir, `icon-${size}.png`), makePng(size, nudgeIcon));
  console.log(`✓ icon-${size}.png`);
}
