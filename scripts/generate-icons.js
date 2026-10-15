import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 per scanline
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Tactical design: dark cyan background with glowing cyan reticle
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      const radius = width * 0.35;
      const innerRadius = width * 0.18;

      let pr = r, pg = g, pb = b, pa = a;

      // Outer circle rim
      if (Math.abs(dist - radius) < width * 0.02) {
        pr = 34; pg = 211; pb = 238; // #22d3ee
      } else if (Math.abs(dist - innerRadius) < width * 0.025) {
        pr = 52; pg = 211; pb = 153; // #34d399
      } else if (dist < innerRadius) {
        pr = 14; pg = 165; pb = 233; // #0ea5e9
      } else {
        // Deep HUD background #050811
        pr = 5; pg = 8; pb = 17;
      }

      rawData[pxOffset] = pr;
      rawData[pxOffset + 1] = pg;
      rawData[pxOffset + 2] = pb;
      rawData[pxOffset + 3] = pa;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192, 5, 8, 17));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512, 5, 8, 17));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPNG(512, 512, 5, 8, 17));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, 5, 8, 17));
fs.writeFileSync('public/favicon.ico', createPNG(32, 32, 5, 8, 17));

console.log('PNG icon assets created successfully!');
