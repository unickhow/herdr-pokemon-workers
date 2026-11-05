// Draws the Poké Ball for empty spaces (mods/pokemon-workers/fx/ball.gif): it stands still, rocks left and right twice, stands
// still again, and loops. Drawn from shapes here, so no artwork is copied from anywhere.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodeGif } from "../mods/pokemon-workers/gif.js";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "mods", "pokemon-workers", "fx", "ball.gif");
const LW = 22, LH = 16, S = 2, CX = 11, CY = 8.5, R = 7.5, PIVOT = [CX, LH];   // logical size, scale, ball centre/radius, rocking pivot (its bottom)
const C = { line: [43, 43, 58], red: [226, 62, 56], hi: [255, 128, 112], white: [244, 244, 248], shade: [200, 204, 218] };

function pixel(x, y, a) {                         // colour of the ball at a logical pixel when rocked by `a` degrees, or null
  const r = (-a * Math.PI) / 180, dx = x + 0.5 - PIVOT[0], dy = y + 0.5 - PIVOT[1];
  const u = CX + dx * Math.cos(r) - dy * Math.sin(r) , v = PIVOT[1] + dx * Math.sin(r) + dy * Math.cos(r);   // back into the upright ball
  const px = u - CX, py = v - CY, d = Math.hypot(px, py);
  if (d > R) return null;
  if (d > R - 1.1) return C.line;
  if (Math.abs(py) < 0.9) return C.line;                              // the black band
  if (d < 2.3) return d > 1.4 ? C.line : C.white;                     // the button
  if (py < 0) return px + py < -6.2 ? C.hi : C.red;                   // top half, with a small highlight
  return px + py > 5 ? C.shade : C.white;                             // bottom half, shaded at the lower right
}

const rock = [0, -12, -22, -12, 0, 12, 22, 12, 0];                      // one swing left, then right
const steps = [[0, 90], ...rock.slice(1).map((a) => [a, 7]), ...rock.slice(1).map((a) => [a, 7]), [0, 130]];
const W = LW * S, H = LH * S, frames = steps.map(([a, delay]) => {
  const rgba = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = pixel(Math.floor(x / S), Math.floor(y / S), a);
    if (c) rgba.set([c[0], c[1], c[2], 255], (y * W + x) * 4);
  }
  return { rgba, delay };
});
fs.writeFileSync(OUT, encodeGif(frames, W, H));
console.log("ball.gif", `${W}x${H}`, frames.length, "frames");
