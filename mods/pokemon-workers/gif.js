// A small animated-GIF writer: one global palette, index 0 transparent, frames restore to background.
function lzw(minCode, idx) {
  const out = [], clear = 1 << minCode, eoi = clear + 1;
  let cur = 0, shift = 0, next = eoi + 1, size = minCode + 1, table = new Map();
  const emit = (code) => { cur |= code << shift; shift += size; while (shift >= 8) { out.push(cur & 255); cur >>= 8; shift -= 8; } };
  emit(clear);
  let ib = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i], key = (ib << 8) | k, code = table.get(key);
    if (code === undefined) {
      emit(ib);
      if (next === 4096) { emit(clear); next = eoi + 1; size = minCode + 1; table = new Map(); }
      else { if (next >= 1 << size) size++; table.set(key, next++); }
      ib = k;
    } else ib = code;
  }
  emit(ib); emit(eoi);
  if (shift > 0) out.push(cur & 255);
  return out;
}

// frames: [{ rgba: Uint8Array (w*h*4), delay: centiseconds }]. Pixels with alpha < 128 are transparent.
export function encodeGif(frames, w, h) {
  const index = new Map(), palette = [[0, 0, 0]];
  for (const f of frames) {
    for (let i = 0; i < f.rgba.length; i += 4) {
      if (f.rgba[i + 3] < 128) continue;
      const k = (f.rgba[i] << 16) | (f.rgba[i + 1] << 8) | f.rgba[i + 2];
      if (!index.has(k)) { index.set(k, palette.length); palette.push([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2]]); }
    }
  }
  if (palette.length > 256) throw new Error("too many colours for a GIF");
  const frameIdx = frames.map((f) => {
    const idx = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) idx[i] = f.rgba[i * 4 + 3] >= 128 ? index.get((f.rgba[i * 4] << 16) | (f.rgba[i * 4 + 1] << 8) | f.rgba[i * 4 + 2]) : 0;
    return idx;
  });
  let bits = 1; while ((1 << bits) < palette.length) bits++;
  const out = [71, 73, 70, 56, 57, 97, w & 255, w >> 8, h & 255, h >> 8, 0x80 | ((bits - 1) << 4) | (bits - 1), 0, 0];
  for (let i = 0; i < 1 << bits; i++) { const c = palette[i] || [0, 0, 0]; out.push(c[0], c[1], c[2]); }
  out.push(0x21, 0xff, 11, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1, 0, 0, 0);   // loop forever
  const minCode = Math.max(2, bits);
  frames.forEach((f, n) => {
    const d = Math.max(2, f.delay | 0);
    out.push(0x21, 0xf9, 4, (2 << 2) | 1, d & 255, d >> 8, 0, 0);
    out.push(0x2c, 0, 0, 0, 0, w & 255, w >> 8, h & 255, h >> 8, 0, minCode);
    const data = lzw(minCode, frameIdx[n]);
    for (let i = 0; i < data.length; i += 255) { const part = data.slice(i, i + 255); out.push(part.length, ...part); }
    out.push(0);
  });
  out.push(0x3b);
  return Uint8Array.from(out);
}
