// 產生 App 圖示（PNG）。執行：node scripts/make-icons.js
// 圖案：酒紅底上三張錯開的貼文卡（FB／IG／Threads 一次出稿），最前面一張有黃色螢光標題線。
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [0x7a, 0x1f, 0x45];
const CARD = [0xff, 0xff, 0xff];
const CARD2 = [0xf3, 0xd3, 0xdc];
const CARD3 = [0xd9, 0x8f, 0xa6];
const MARK = [0xe2, 0xc2, 0x9a];
const INK = [0x7a, 0x1f, 0x45];

const sdRoundRect = (x, y, x0, y0, x1, y1, r) => {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = (x1 - x0) / 2 - r, hy = (y1 - y0) / 2 - r;
  const dx = Math.max(Math.abs(x - cx) - hx, 0), dy = Math.max(Math.abs(y - cy) - hy, 0);
  return Math.hypot(dx, dy) - r;
};
const inRR = (x, y, x0, y0, x1, y1, r) => sdRoundRect(x, y, x0, y0, x1, y1, r) <= 0;

function render(size, { content = 1, rounded = false } = {}) {
  const S = 4;
  const px = Buffer.alloc(size * size * 4);
  const m = t => 0.5 + (t - 0.5) * content;
  const k = content;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sj = 0; sj < S; sj++) for (let si = 0; si < S; si++) {
      const x = (i + (si + 0.5) / S) / size, y = (j + (sj + 0.5) / S) / size;
      if (rounded && !inRR(x, y, 0, 0, 1, 1, 0.22)) continue;
      let c = BG;
      if (inRR(x, y, m(0.36), m(0.18), m(0.80), m(0.64), 0.045 * k)) c = CARD3;
      if (inRR(x, y, m(0.28), m(0.26), m(0.72), m(0.72), 0.045 * k)) c = CARD2;
      if (inRR(x, y, m(0.20), m(0.34), m(0.64), m(0.80), 0.045 * k)) {
        c = CARD;
        if (inRR(x, y, m(0.26), m(0.47), m(0.56), m(0.53), 0.01 * k)) c = MARK;
        if (inRR(x, y, m(0.26), m(0.42), m(0.52), m(0.48), 0.012 * k)) c = INK;
        if (inRR(x, y, m(0.26), m(0.60), m(0.58), m(0.625), 0.01 * k)) c = CARD3;
        if (inRR(x, y, m(0.26), m(0.665), m(0.50), m(0.69), 0.01 * k)) c = CARD3;
      }
      r += c[0]; g += c[1]; b += c[2]; a += 255;
    }
    const n = S * S, o = (j * size + i) * 4, cov = a / n;
    px[o] = cov ? Math.round(r / (a / 255)) : 0;
    px[o + 1] = cov ? Math.round(g / (a / 255)) : 0;
    px[o + 2] = cov ? Math.round(b / (a / 255)) : 0;
    px[o + 3] = Math.round(cov);
  }
  return encodePNG(size, px);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });
const write = (name, buf) => { fs.writeFileSync(path.join(out, name), buf); console.log(name, buf.length, 'bytes'); };
write('icon-192.png', render(192, { rounded: true }));
write('icon-512.png', render(512, { rounded: true }));
write('maskable-512.png', render(512, { content: 0.78 }));
write('apple-touch-icon.png', render(180));
write('favicon-32.png', render(32, { rounded: true }));
