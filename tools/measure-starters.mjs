// Adds a `box` {x,y,w,h} (union of visible pixels over every frame/facing) to each anim in starters/manifest.js.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mf = path.join(ROOT, "starters", "manifest.js");
const data = JSON.parse(fs.readFileSync(mf, "utf8").replace(/^window\.STARTERS = /, "").replace(/;\s*$/, ""));

function decode(file) {
  const b = fs.readFileSync(file);
  let p = 8, w = 0, h = 0, ct = 0, idat = [], plte = null, trns = null;
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString("ascii", p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12] !== 0) throw new Error("unsupported png " + file); }
    else if (type === "PLTE") plte = d; else if (type === "tRNS") trns = d; else if (type === "IDAT") idat.push(d);
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : ct === 3 ? 1 : ct === 4 ? 2 : 1;
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, u = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += u; else if (f === 3) v += (a + u) >> 1;
      else if (f === 4) { const pp = a + u - c, pa = Math.abs(pp - a), pb = Math.abs(pp - u), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? u : c; }
      px[y * stride + x] = v & 255;
    }
  }
  const alpha = (x, y) => ct === 6 ? px[y * stride + x * 4 + 3] : ct === 4 ? px[y * stride + x * 2 + 1] : ct === 3 ? (trns ? (trns[px[y * stride + x]] ?? 255) : 255) : 255;
  return { w, h, alpha };
}

for (const sp of data) for (const [name, a] of Object.entries(sp.anims)) {
  const img = decode(path.join(ROOT, a.file));
  const cols = Math.floor(img.w / a.fw), rows = Math.floor(img.h / a.fh);
  const mkBox = (r0, r1) => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let r = r0; r < r1; r++) for (let c = 0; c < cols; c++)
      for (let y = 0; y < a.fh; y++) for (let x = 0; x < a.fw; x++)
        if (img.alpha(c * a.fw + x, r * a.fh + y) > 20) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return x1 < 0 ? { x: 0, y: 0, w: a.fw, h: a.fh } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; };
  a.cols = cols; a.rows = rows;
  a.box = mkBox(0, rows);
  a.rowBox = []; for (let r = 0; r < rows; r++) a.rowBox.push(mkBox(r, r + 1));
}
fs.writeFileSync(mf, "window.STARTERS = " + JSON.stringify(data) + ";\n");
const sizes = data.map((s) => `${s.id}:${s.anims.Idle.rowBox[0].h}`).join(" ");
console.log(sizes);
