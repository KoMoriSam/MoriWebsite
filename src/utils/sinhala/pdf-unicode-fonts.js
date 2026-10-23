import glyphs from "./pdf-unicode-glyphs.generated.js";

// PDF producers sometimes write a visual glyph's neighbours into ToUnicode.
// Identify the actual outline, never a font name or a subset-dependent GID.
export function sinhalaGlyphMap(data) {
  if (!(data instanceof Uint8Array)) return new Map();
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const u16 = (at) => view.getUint16(at);
  const tables = {};
  try {
    const count = u16(4);
    if (count > 256) return new Map();
    for (let index = 0; index < count; index++) {
      const at = 12 + index * 16;
      const tag = String.fromCharCode(...data.subarray(at, at + 4));
      const start = view.getUint32(at + 8);
      const length = view.getUint32(at + 12);
      if (start + length > data.length) return new Map();
      tables[tag] = { start, length };
    }
    if (!["head", "maxp", "loca", "glyf", "cmap"].every((tag) => tables[tag]))
      return new Map();
    const long = view.getInt16(tables.head.start + 50) === 1;
    const countGlyphs = u16(tables.maxp.start + 4);
    const location = (id) =>
      long
        ? view.getUint32(tables.loca.start + id * 4)
        : u16(tables.loca.start + id * 2) * 2;
    const fingerprints = new Map();
    const fingerprint = (id, depth = 0) => {
      if (fingerprints.has(id)) return fingerprints.get(id);
      if (depth > 12 || id >= countGlyphs) return "";
      const start = tables.glyf.start + location(id);
      const end = tables.glyf.start + location(id + 1);
      if (start === end || end > tables.glyf.start + tables.glyf.length)
        return "";
      let hash = 2166136261;
      let second = 5381;
      const byte = (value) => {
        hash = Math.imul(hash ^ value, 16777619) >>> 0;
        second = (Math.imul(second, 33) ^ value) >>> 0;
      };
      const bytes = (from, to) => {
        if (to > end) throw new RangeError("Invalid glyph");
        for (let at = from; at < to; at++) byte(data[at]);
      };
      const contours = view.getInt16(start);
      bytes(start, start + 10);
      let at = start + 10;
      if (contours >= 0) {
        const points = contours ? u16(at + contours * 2 - 2) + 1 : 0;
        bytes(at, at + contours * 2);
        at += contours * 2;
        at += 2 + u16(at); // Hint instructions do not identify an outline.
        const flagsStart = at;
        let coordinateBytes = 0;
        let point = 0;
        while (point < points) {
          if (at >= end) throw new RangeError("Invalid glyph flags");
          const flags = data[at++];
          const repeat = flags & 8 ? data[at++] + 1 : 1;
          point += repeat;
          coordinateBytes +=
            repeat *
            ((flags & 2 ? 1 : flags & 16 ? 0 : 2) +
              (flags & 4 ? 1 : flags & 32 ? 0 : 2));
        }
        bytes(flagsStart, at + coordinateBytes);
      } else {
        let more;
        do {
          const flags = u16(at);
          const component = u16(at + 2);
          at += 4;
          byte((flags & ~256) >>> 8);
          byte(flags & 255);
          for (const character of fingerprint(component, depth + 1))
            byte(character.charCodeAt(0));
          const size =
            (flags & 1 ? 4 : 2) +
            (flags & 8 ? 2 : flags & 64 ? 4 : flags & 128 ? 8 : 0);
          bytes(at, at + size);
          at += size;
          more = flags & 32;
        } while (more);
      }
      const key =
        hash.toString(16).padStart(8, "0") +
        second.toString(16).padStart(8, "0");
      fingerprints.set(id, key);
      return key;
    };
    const mapped = new Map();
    const cmap = tables.cmap.start;
    for (let index = 0; index < u16(cmap + 2); index++) {
      const record = cmap + 4 + index * 8;
      if (![0, 3].includes(u16(record))) continue;
      const start = cmap + view.getUint32(record + 4);
      if (u16(start) === 12) {
        const groups = view.getUint32(start + 12);
        if (groups > 65536) return new Map();
        for (let group = 0; group < groups; group++) {
          const at = start + 16 + group * 12;
          const first = view.getUint32(at);
          const last = view.getUint32(at + 4);
          const firstGlyph = view.getUint32(at + 8);
          if (last - first >= countGlyphs) return new Map();
          for (let code = first; code <= last; code++) {
            const text = glyphs[fingerprint(firstGlyph + code - first)];
            if (text) mapped.set(code, text);
          }
        }
        continue;
      }
      if (u16(start) !== 4) continue;
      const segments = u16(start + 6) / 2;
      for (let segment = 0; segment < segments; segment++) {
        const last = u16(start + 14 + segment * 2);
        const first = u16(start + 16 + segments * 2 + segment * 2);
        const delta = view.getInt16(start + 16 + segments * 4 + segment * 2);
        const position = start + 16 + segments * 6 + segment * 2;
        const range = u16(position);
        for (let code = first; code <= last && code < 65535; code++) {
          let id = range ? u16(position + range + (code - first) * 2) : code;
          if (id) id = (id + delta) & 65535;
          if (!id) continue;
          const text = glyphs[fingerprint(id)];
          if (text) mapped.set(code, text);
        }
      }
    }
    return mapped;
  } catch {
    // Unsupported or damaged font data must not prevent reading the PDF.
    return new Map();
  }
}
