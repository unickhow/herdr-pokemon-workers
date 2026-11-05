// Draws the twinkle for shiny animals (mods/pokemon-workers/fx/shine.gif): a small four-point star that grows, shrinks and
// vanishes for a moment, over and over. Drawn from shapes here, so no artwork is copied from anywhere.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodeGif } from "../mods/pokemon-workers/gif.js";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "mods", "pokemon-workers", "fx", "shine.gif");
const N = 11, S = 2, M = 5, GOLD = [255, 226, 122], WHITE = [255, 255, 255];
const steps = [[1, 8], [2, 8], [3, 8], [5, 10], [3, 8], [2, 8], [1, 8], [0, 70]];          // [arm length, centiseconds]
const frames = steps.map(([len, delay]) => {
  const px = new Map();
  if (len > 0) {
    px.set(M + "," + M, WHITE);
    for (let i = 1; i <= len; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px.set(M + dx * i + "," + (M + dy * i), i === 1 ? WHITE : GOLD);
    if (len >= 4) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) px.set(M + dx + "," + (M + dy), GOLD);
  }
  const rgba = new Uint8Array(N * S * N * S * 4);
  for (let y = 0; y < N * S; y++) for (let x = 0; x < N * S; x++) {
    const c = px.get(Math.floor(x / S) + "," + Math.floor(y / S));
    if (c) rgba.set([c[0], c[1], c[2], 255], (y * N * S + x) * 4);
  }
  return { rgba, delay };
});
fs.writeFileSync(OUT, encodeGif(frames, N * S, N * S));
console.log("shine.gif", N * S + "x" + N * S, frames.length, "frames");
