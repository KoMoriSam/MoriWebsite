export const IMAGE_FORMATS = Object.freeze({
  png: { label: "PNG", mime: "image/png", extension: "png", alpha: true },
  jpeg: { label: "JPEG", mime: "image/jpeg", extension: "jpg", alpha: false },
  webp: { label: "WebP", mime: "image/webp", extension: "webp", alpha: true },
  avif: { label: "AVIF", mime: "image/avif", extension: "avif", alpha: true },
  bmp: { label: "BMP", mime: "image/bmp", extension: "bmp", alpha: false },
  gif: { label: "GIF", mime: "image/gif", extension: "gif", alpha: true },
});

const ASCII = new TextDecoder("ascii");

export function detectImageFormat(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 12) return null;
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (ASCII.decode(bytes.subarray(0, 6)) === "GIF87a" || ASCII.decode(bytes.subarray(0, 6)) === "GIF89a") return "gif";
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return "bmp";
  if (ASCII.decode(bytes.subarray(0, 4)) === "RIFF" && ASCII.decode(bytes.subarray(8, 12)) === "WEBP") return "webp";

  const scanEnd = Math.min(bytes.length, 64);
  for (let offset = 4; offset + 8 <= scanEnd; offset += 4) {
    if (ASCII.decode(bytes.subarray(offset, offset + 4)) !== "ftyp") continue;
    const brands = ASCII.decode(bytes.subarray(offset + 4, Math.min(scanEnd, offset + 28)));
    if (/avif|avis|mif1|msf1/.test(brands)) return "avif";
  }
  return null;
}

export function validateEncodedImage(input, format) {
  return detectImageFormat(input) === format;
}

export function readImageDimensions(input, format = detectImageFormat(input)) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (format === "png" && bytes.length >= 24) return { width: readUint32BE(bytes, 16), height: readUint32BE(bytes, 20) };
  if (format === "gif" && bytes.length >= 10) return { width: readUint16LE(bytes, 6), height: readUint16LE(bytes, 8) };
  if (format === "bmp" && bytes.length >= 26) return { width: Math.abs(readInt32LE(bytes, 18)), height: Math.abs(readInt32LE(bytes, 22)) };
  if (format === "jpeg") return readJpegDimensions(bytes);
  if (format === "webp") return readWebPDimensions(bytes);
  if (format === "avif") return readAvifDimensions(bytes);
  return null;
}

export function isAnimatedWebP(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (detectImageFormat(bytes) !== "webp") return false;
  for (let offset = 12; offset + 8 <= bytes.length; ) {
    const type = ASCII.decode(bytes.subarray(offset, offset + 4));
    const size = readUint32LE(bytes, offset + 4);
    if (type === "ANIM" || type === "ANMF") return true;
    if (type === "VP8X" && size >= 1 && (bytes[offset + 8] & 0x02) !== 0) return true;
    offset += 8 + size + (size & 1);
  }
  return false;
}

export function readWebPLoopCount(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  for (let offset = 12; offset + 14 <= bytes.length; ) {
    const type = ASCII.decode(bytes.subarray(offset, offset + 4));
    const size = readUint32LE(bytes, offset + 4);
    if (type === "ANIM" && size >= 6) return bytes[offset + 12] | (bytes[offset + 13] << 8);
    offset += 8 + size + (size & 1);
  }
  return 0;
}

export function patchWebPLoopCount(input, loopCount) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const copy = new Uint8Array(bytes);
  for (let offset = 12; offset + 14 <= copy.length; ) {
    const type = ASCII.decode(copy.subarray(offset, offset + 4));
    const size = readUint32LE(copy, offset + 4);
    if (type === "ANIM" && size >= 6) {
      const normalized = Math.max(0, Math.min(65535, Math.round(loopCount || 0)));
      copy[offset + 12] = normalized & 0xff;
      copy[offset + 13] = normalized >> 8;
      break;
    }
    offset += 8 + size + (size & 1);
  }
  return copy;
}

export function readGifLoopCount(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const marker = new TextEncoder().encode("NETSCAPE2.0");
  for (let i = 0; i + marker.length + 5 < bytes.length; i += 1) {
    let matched = true;
    for (let j = 0; j < marker.length; j += 1) {
      if (bytes[i + j] !== marker[j]) { matched = false; break; }
    }
    if (!matched) continue;
    const block = i + marker.length;
    if (bytes[block] === 3 && bytes[block + 1] === 1) return bytes[block + 2] | (bytes[block + 3] << 8);
  }
  return 0;
}

export function calculateOutputDimensions(width, height, resize = {}) {
  const sourceWidth = Math.max(1, Math.round(Number(width) || 1));
  const sourceHeight = Math.max(1, Math.round(Number(height) || 1));
  if (!resize.enabled) return { width: sourceWidth, height: sourceHeight };

  const requestedWidth = Math.max(1, Math.round(Number(resize.width) || sourceWidth));
  const requestedHeight = Math.max(1, Math.round(Number(resize.height) || sourceHeight));
  let targetWidth = requestedWidth;
  let targetHeight = requestedHeight;
  const ratio = sourceWidth / sourceHeight;

  if (resize.mode === "width") targetHeight = Math.max(1, Math.round(targetWidth / ratio));
  else if (resize.mode === "height") targetWidth = Math.max(1, Math.round(targetHeight * ratio));
  else if (resize.mode === "contain") {
    const scale = Math.min(requestedWidth / sourceWidth, requestedHeight / sourceHeight);
    targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    targetHeight = Math.max(1, Math.round(sourceHeight * scale));
  } else if (resize.lockAspectRatio !== false) {
    targetHeight = Math.max(1, Math.round(targetWidth / ratio));
  }

  if (resize.preventUpscale !== false) {
    const scale = Math.min(1, sourceWidth / targetWidth, sourceHeight / targetHeight);
    targetWidth = Math.max(1, Math.round(targetWidth * scale));
    targetHeight = Math.max(1, Math.round(targetHeight * scale));
  }
  return { width: targetWidth, height: targetHeight };
}

export function estimateDecodedBytes(width, height, frameCount = 1) {
  return Math.max(0, Number(width) || 0) * Math.max(0, Number(height) || 0) * 4 * Math.max(1, Number(frameCount) || 1);
}

export function getDefaultMemoryLimit(userAgent = "") {
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  return (mobile ? 256 : 512) * 1024 * 1024;
}

export function makeOutputName(sourceName, format, suffix = "") {
  const base = String(sourceName || "image").replace(/\.[^.]*$/, "").replace(/[\\/:*?"<>|]+/g, "-") || "image";
  const extension = IMAGE_FORMATS[format]?.extension || format;
  return `${base}${suffix}.${extension}`;
}

export function makeUniqueName(name, usedNames) {
  if (!usedNames.has(name)) { usedNames.add(name); return name; }
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  let index = 2;
  while (usedNames.has(`${base}-${index}${extension}`)) index += 1;
  const unique = `${base}-${index}${extension}`;
  usedNames.add(unique);
  return unique;
}

export function formatBytes(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value;
  let unit = -1;
  do { size /= 1024; unit += 1; } while (size >= 1024 && unit < units.length - 1);
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unit]}`;
}

function readUint32LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

function readUint16LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readInt32LE(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getInt32(0, true);
}

function readUint32BE(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}

function readJpegDimensions(bytes) {
  for (let offset = 2; offset + 9 < bytes.length; ) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: (bytes[offset + 7] << 8) | bytes[offset + 8], height: (bytes[offset + 5] << 8) | bytes[offset + 6] };
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
    if (offset + 3 >= bytes.length) break;
    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (size < 2) break;
    offset += 2 + size;
  }
  return null;
}

function readWebPDimensions(bytes) {
  for (let offset = 12; offset + 10 <= bytes.length; ) {
    const type = ASCII.decode(bytes.subarray(offset, offset + 4));
    const size = readUint32LE(bytes, offset + 4) >>> 0;
    const data = offset + 8;
    if (type === "VP8X" && size >= 10) {
      return { width: 1 + bytes[data + 4] + (bytes[data + 5] << 8) + (bytes[data + 6] << 16), height: 1 + bytes[data + 7] + (bytes[data + 8] << 8) + (bytes[data + 9] << 16) };
    }
    if (type === "VP8 " && size >= 10 && bytes[data + 3] === 0x9d && bytes[data + 4] === 0x01 && bytes[data + 5] === 0x2a) {
      return { width: readUint16LE(bytes, data + 6) & 0x3fff, height: readUint16LE(bytes, data + 8) & 0x3fff };
    }
    if (type === "VP8L" && size >= 5 && bytes[data] === 0x2f) {
      return { width: 1 + bytes[data + 1] + ((bytes[data + 2] & 0x3f) << 8), height: 1 + (bytes[data + 2] >> 6) + (bytes[data + 3] << 2) + ((bytes[data + 4] & 0x0f) << 10) };
    }
    offset += 8 + size + (size & 1);
  }
  return null;
}

function readAvifDimensions(bytes) {
  for (let offset = 4; offset + 16 <= bytes.length; offset += 1) {
    if (ASCII.decode(bytes.subarray(offset, offset + 4)) !== "ispe") continue;
    return { width: readUint32BE(bytes, offset + 8), height: readUint32BE(bytes, offset + 12) };
  }
  return null;
}
