// A small PNG reader: 8-bit, not interlaced (what SpriteCollab ships). Returns RGBA pixels.
import * as zlib from "zlib";

const u32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;

export function decodePng(bytes) {
  let p = 8, w = 0, h = 0, ct = 0, plte = null, trns = null;
  const idat = [];
  while (p + 8 <= bytes.length) {
    const len = u32(bytes, p), type = String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]);
    const d = bytes.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") {
      w = u32(d, 0); h = u32(d, 4); ct = d[9];
      if (d[8] !== 8 || d[12] !== 0) throw new Error("unsupported PNG (need 8-bit, not interlaced)");
    } else if (type === "PLTE") plte = d;
    else if (type === "tRNS") trns = d;
    else if (type === "IDAT") idat.push(d);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  const bpp = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  if (!bpp) throw new Error("unsupported PNG colour type " + ct);
  let total = 0; for (const d of idat) total += d.length;
  const joined = new Uint8Array(total); let o = 0; for (const d of idat) { joined.set(d, o); o += d.length; }
  const raw = zlib.inflateSync(joined), stride = w * bpp, px = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], base = y * (stride + 1) + 1, row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[row + x - bpp] : 0, u = y ? px[row - stride + x] : 0, c = x >= bpp && y ? px[row - stride + x - bpp] : 0;
      let v = raw[base + x];
      if (f === 1) v += a; else if (f === 2) v += u; else if (f === 3) v += (a + u) >> 1;
      else if (f === 4) { const pp = a + u - c, pa = Math.abs(pp - a), pb = Math.abs(pp - u), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? u : c; }
      px[row + x] = v & 255;
    }
  }
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    let r, g, b, a = 255;
    if (ct === 6) { r = px[i * 4]; g = px[i * 4 + 1]; b = px[i * 4 + 2]; a = px[i * 4 + 3]; }
    else if (ct === 2) { r = px[i * 3]; g = px[i * 3 + 1]; b = px[i * 3 + 2]; }
    else if (ct === 3) { const k = px[i]; r = plte[k * 3]; g = plte[k * 3 + 1]; b = plte[k * 3 + 2]; a = trns && k < trns.length ? trns[k] : 255; }
    else if (ct === 4) { r = g = b = px[i * 2]; a = px[i * 2 + 1]; }
    else { r = g = b = px[i]; }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a;
  }
  return { w, h, rgba };
}
