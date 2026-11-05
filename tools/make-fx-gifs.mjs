// Turns the pixelfx sprite sheets in fx/ into small looping GIFs for the mod (mods/pokemon-workers/fx/).
// pixelfx is MIT licensed: see vendor/pixelfx/LICENSE and NOTICE.md.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng } from "../mods/pokemon-workers/png.js";
import { encodeGif } from "../mods/pokemon-workers/gif.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, "fx", "manifest.js"), "utf8").replace(/^window\.FX = /, "").replace(/;\s*$/, ""));
const OUT = path.join(ROOT, "mods", "pokemon-workers", "fx");
fs.mkdirSync(OUT, { recursive: true });

function convert(key, outName, scale) {
  const d = FX[key], sheet = decodePng(new Uint8Array(fs.readFileSync(path.join(ROOT, d.file))));
  const cells = [];
  for (let i = 0; i < d.n; i++) cells.push({ ox: (i % d.cols) * d.fw, oy: Math.floor(i / d.cols) * d.fh });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const c of cells) for (let y = 0; y < d.fh; y++) for (let x = 0; x < d.fw; x++) {
    if (sheet.rgba[((c.oy + y) * sheet.w + c.ox + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, W = Math.round(bw * scale), H = Math.round(bh * scale), frames = [];
  for (const c of cells) {
    const rgba = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sx = c.ox + x0 + Math.min(bw - 1, Math.floor((x + 0.5) / scale)), sy = c.oy + y0 + Math.min(bh - 1, Math.floor((y + 0.5) / scale));
      const s = (sy * sheet.w + sx) * 4, o = (y * W + x) * 4;
      rgba[o] = sheet.rgba[s]; rgba[o + 1] = sheet.rgba[s + 1]; rgba[o + 2] = sheet.rgba[s + 2]; rgba[o + 3] = sheet.rgba[s + 3] >= 40 ? 255 : 0;
    }
    frames.push({ rgba, delay: 3 });
  }
  // GIFs hold at most 255 colours: coarsen the colours until the whole animation fits
  for (const q of [4, 8, 12, 16, 20, 24, 32, 40, 48, 64]) {
    const seen = new Set();
    for (const f of frames) for (let i = 0; i < f.rgba.length; i += 4) if (f.rgba[i + 3]) seen.add(((Math.round(f.rgba[i] / q) * q) << 16) | ((Math.round(f.rgba[i + 1] / q) * q) << 8) | Math.round(f.rgba[i + 2] / q) * q);
    if (seen.size <= 255) {
      for (const f of frames) for (let i = 0; i < f.rgba.length; i += 4) if (f.rgba[i + 3]) for (let k = 0; k < 3; k++) f.rgba[i + k] = Math.min(255, Math.round(f.rgba[i + k] / q) * q);
      break;
    }
  }
  const gif = encodeGif(frames, W, H);
  fs.writeFileSync(path.join(OUT, outName), gif);
  console.log(outName, `${W}x${H}`, gif.length, "bytes", d.n, "frames");
}
convert("sleep__sheep", "sleep.gif", 1);
convert("alert__all", "alert.gif", 1);
