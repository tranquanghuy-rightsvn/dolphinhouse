// Intrinsic size of local images, read from the file header at build time, so
// every <img> can carry width/height and the browser reserves its box before
// the image arrives — no layout shift (audit T11). No dependency: JPEG, PNG,
// GIF and WebP headers are parsed directly. Unknown/missing files return null.
import { openSync, readSync, closeSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const cache = new Map();
export const missingImages = new Set();

function readHead(file, bytes) {
  const fd = openSync(file, "r");
  try {
    const buf = Buffer.alloc(bytes);
    const n = readSync(fd, buf, 0, bytes, 0);
    return buf.subarray(0, n);
  } finally {
    closeSync(fd);
  }
}

function parse(buf) {
  if (buf.length < 24) return null;
  // PNG
  if (buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  // GIF
  if (buf.toString("ascii", 0, 3) === "GIF") return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  // WebP
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
    return null;
  }
  // JPEG: walk the segments to the first SOFn marker
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

export function imageSize(src) {
  if (!src || !src.startsWith("/") || src.startsWith("//")) return null;
  if (cache.has(src)) return cache.get(src);
  const file = join(ROOT, decodeURI(src.split(/[?#]/)[0]));
  let size = null;
  if (!existsSync(file)) missingImages.add(src);
  else {
    try {
      size = parse(readHead(file, 256 * 1024));
    } catch {
      size = null;
    }
  }
  cache.set(src, size);
  return size;
}

// ` width="W" height="H"` for a local image, "" when unknown.
export function sizeAttrs(src) {
  const s = imageSize(src);
  return s && s.w && s.h ? ` width="${s.w}" height="${s.h}"` : "";
}

// Adds width/height to <img> tags in CMS rich text that have neither.
export function addImageSizes(html) {
  return String(html || "").replace(/<img\b[^>]*>/gi, (tag) => {
    if (/\swidth\s*=/.test(tag) || /\sheight\s*=/.test(tag)) return tag;
    const m = tag.match(/\ssrc\s*=\s*"([^"]+)"/i);
    const attrs = m ? sizeAttrs(m[1]) : "";
    return attrs ? tag.replace(/<img\b/i, `<img${attrs}`) : tag;
  });
}
