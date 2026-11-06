// Draws the laptop that sits in front of a working animal (mods/pokemon-workers/fx/laptop.gif): the back of a laptop whose
// screen faces the animal, with a breathing logo and a blinking work light. Drawn from shapes here, so no artwork is copied from anywhere.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodeGif } from "../mods/pokemon-workers/gif.js";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "mods", "pokemon-workers", "fx", "laptop.gif");
const LW = 18, LH = 13, S = 2;                       // logical size and scale
const C = { edge: [58, 62, 84], lid: [154, 161, 184], lidHi: [196, 203, 224], screen: [20, 26, 44], base: [120, 127, 150], baseHi: [170, 177, 200], key: [78, 84, 106], dot: [127, 212, 255], logoDim: [120, 128, 152], logo: [214, 222, 242], logoHi: [255, 255, 255] };
// Seen from the front of the room: the screen faces the animal, so what shows is the back of the lid (with a logo that
// breathes) and the front edge of the base, with a small light that blinks while it works.
function frame(step) {
  const g = Array.from({ length: LH }, () => Array(LW).fill(null));
  const fr = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < LW) g[j][i] = c; };
  fr(1, 0, 16, 10, C.edge); fr(2, 1, 14, 8, C.lid); fr(2, 1, 14, 1, C.lidHi);          // the back of the lid
  fr(2, 8, 14, 1, C.base);
  const glow = [C.logoDim, C.logo, C.logoHi, C.logo][step % 4];                          // the logo breathes
  fr(8, 4, 2, 2, glow); fr(9, 3, 1, 1, glow);
  fr(0, 10, 18, 2, C.base); fr(0, 10, 18, 1, C.baseHi); fr(0, 12, 18, 1, C.edge);        // the base, seen from its front edge
  fr(8, 11, 2, 1, step % 6 < 3 ? C.dot : C.key);                                         // the little work light
  return g;
}

const frames = [];
for (let step = 0; step < 12; step++) for (const d of [14]) {
  const g = frame(step), W = LW * S, H = LH * S, rgba = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = g[Math.floor(y / S)][Math.floor(x / S)]; if (c) rgba.set([c[0], c[1], c[2], 255], (y * W + x) * 4); }
  frames.push({ rgba, delay: d });
}
fs.writeFileSync(OUT, encodeGif(frames, LW * S, LH * S));
console.log("laptop.gif", `${LW * S}x${LH * S}`, frames.length, "frames");
