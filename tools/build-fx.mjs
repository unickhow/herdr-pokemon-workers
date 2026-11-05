#!/usr/bin/env node
// Renders the pixelfx effects used by the mockup into transparent sprite sheets, recoloured per species.
//   node tools/build-fx.mjs            (from the herdr-pasture folder)
// Output: fx/<effect>__<species>.png and fx/manifest.js
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEffect, renderFrames, spriteSheet } from "../vendor/pixelfx/tools/lib/fxlib.mjs";
import { composite } from "../vendor/pixelfx/src/core/index.js";

const here = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(here, "fx");
mkdirSync(out, { recursive: true });

// dark -> bright ramps (six colours each), one per species
const RAMP = {
  fox:   ["#2a140c", "#7a3312", "#d96f24", "#f28c38", "#ffc98a", "#fff3dc"],
  owl:   ["#1a1636", "#3c3a7a", "#7467c2", "#a9b8f0", "#dfe6ff", "#ffffff"],
  frog:  ["#0f2a19", "#24673a", "#46a85c", "#7fd68e", "#c9f2b0", "#f2ffe0"],
  axo:   ["#3a1530", "#8a3a68", "#e0709f", "#f7a8c4", "#ffd9e6", "#fff5f9"],
  sheep: ["#26233a", "#5c5a80", "#a9a6cc", "#d8d5ee", "#f2f0f7", "#ffffff"],
  cat:   ["#18222e", "#3d5266", "#73879b", "#a9bccd", "#d9e5ef", "#ffffff"],
};
// key used by the page -> [effect id, how it is coloured, frames to keep (0 = all), play as loop]
//   "species": one sheet per species ramp; "all": one shared sheet with the given palette (or the effect's own)
const FX = {
  sleep: ["status/sleep",       "species", 0, null],
  alert: ["ui/exclamation",     "all",     0, ["#2a0a10", "#7a1626", "#d6334a", "#ff6b7a", "#ffc0c6", "#ffffff"]],
  star:  ["pickups/power-star", "all",     0, null],
};
const LOOP_FORCED = new Set();
// colour only (no additive glow, so no dark halo around it), then scaled by this factor
const FLAT = { star: 0.62 };
// plain size change, keeping the effect as it is
const SCALE = { alert: 0.6, sleep: 0.6 };

// area-average resample to scale s (premultiplied), for sizes that are not a clean half
function resample(r, s) {
  const w2 = Math.max(1, Math.round(r.w * s)), h2 = Math.max(1, Math.round(r.h * s));
  for (const f of r.frames) {
    const src = f.clear, dst = new Uint8ClampedArray(w2 * h2 * 4);
    for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
      const x0 = x / s, x1 = (x + 1) / s, y0 = y / s, y1 = (y + 1) / s;
      let a = 0, rr = 0, gg = 0, bb = 0, wsum = 0;
      for (let yy = Math.floor(y0); yy < Math.min(r.h, Math.ceil(y1)); yy++) for (let xx = Math.floor(x0); xx < Math.min(r.w, Math.ceil(x1)); xx++) {
        const wx = Math.min(xx + 1, x1) - Math.max(xx, x0), wy = Math.min(yy + 1, y1) - Math.max(yy, y0), wgt = wx * wy, i = (yy * r.w + xx) * 4, al = src[i + 3] * wgt;
        a += al; rr += src[i] * al; gg += src[i + 1] * al; bb += src[i + 2] * al; wsum += wgt;
      }
      const o = (y * w2 + x) * 4;
      if (a > 0) { dst[o] = rr / a; dst[o + 1] = gg / a; dst[o + 2] = bb / a; dst[o + 3] = a / wsum; }
    }
    f.clear = dst;
  }
  r.w = w2; r.h = h2;
}

const manifest = {};
for (const [key, [id, mode, keep, pal]] of Object.entries(FX)) {
  const fx = await loadEffect(id);
  for (const sp of (mode === "all" ? ["all"] : Object.keys(RAMP))) {
    const palette = mode === "all" ? pal : RAMP[sp];
    const r = renderFrames(fx, { actor: false, options: palette ? { palette } : {} });
    if (keep) { r.frames = r.frames.slice(0, keep); r.n = keep; }
    if (FLAT[key]) {
      for (const f of r.frames) { const out = new Uint8ClampedArray(r.w * r.h * 4); composite({ w: r.w, h: r.h, color: f.raw, light: new Uint32Array(r.w * r.h) }, out, null);
        // keep only the solid, bright star body: the rays and soft edge come out dark without the glow layer
        for (let i = 0; i < out.length; i += 4) { const lum = 0.3 * out[i] + 0.59 * out[i + 1] + 0.11 * out[i + 2]; if (out[i + 3] < 200 || lum < 100) out[i + 3] = 0; else out[i + 3] = 255; }
        // then keep only the biggest connected blob (the star body); stray ray fragments go
        const lab = new Int32Array(r.w * r.h), sizes = [0]; let nl = 0;
        for (let s = 0; s < r.w * r.h; s++) {
          if (lab[s] || !out[s * 4 + 3]) continue;
          nl++; sizes[nl] = 0; const stack = [s]; lab[s] = nl;
          while (stack.length) {
            const q = stack.pop(); sizes[nl]++; const qx = q % r.w, qy = (q / r.w) | 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
              const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= r.w || ny >= r.h) continue;
              const ni = ny * r.w + nx; if (!lab[ni] && out[ni * 4 + 3]) { lab[ni] = nl; stack.push(ni); }
            }
          }
        }
        let best = 0; for (let l = 1; l <= nl; l++) if (sizes[l] > sizes[best]) best = l;
        for (let s = 0; s < r.w * r.h; s++) if (lab[s] !== best) out[s * 4 + 3] = 0;
        f.clear = out; }
    }
    const k = FLAT[key] ?? SCALE[key] ?? 1;
    if (k !== 1) resample(r, k);
    const name = `${key}__${sp}`;
    const s = spriteSheet(fx, r, name);
    writeFileSync(join(out, name + ".png"), s.png);
    const p = s.json.meta.pixelfx;
    manifest[name] = { file: `fx/${name}.png`, fw: p.frameSize[0], fh: p.frameSize[1], n: s.json.frames.length, cols: p.columns, fps: p.fps, loop: p.loop || LOOP_FORCED.has(key), px: p.pivot[0] * k, py: p.pivot[1] * k };
    console.log(name, s.json.frames.length + "f", p.frameSize.join("x"));
  }
}
writeFileSync(join(out, "manifest.js"), "window.FX = " + JSON.stringify(manifest, null, 1) + ";\n");
console.log("manifest written");
