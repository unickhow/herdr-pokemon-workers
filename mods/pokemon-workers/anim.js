// Sheets in, GIFs out. SpriteCollab sheets hold one row per facing and one column per frame:
// row 0 faces the viewer, 1 down-right, 2 right, 3 up-right, 4 up, 5 up-left, 6 left, 7 down-left.
import { decodePng } from "./png.js";
import { encodeGif } from "./gif.js";

export function parseAnimData(xml) {
  const anims = {};
  for (const m of xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)) {
    const body = m[1];
    const get = (tag) => body.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1];
    const name = get("Name");
    if (!name) continue;
    anims[name] = {
      name, copyOf: get("CopyOf") ?? null,
      fw: Number(get("FrameWidth")) || 0, fh: Number(get("FrameHeight")) || 0,
      durations: [...body.matchAll(/<Duration>(\d+)<\/Duration>/g)].map((d) => Number(d[1])),
    };
  }
  return anims;
}

// "Idle is a copy of Walk": follow CopyOf to the animation that owns a sheet.
export function resolveAnim(anims, name) {
  let a = anims[name];
  for (let hops = 0; a?.copyOf && hops < 4; hops++) a = anims[a.copyOf];
  return a && a.fw > 0 && a.fh > 0 ? a : null;
}

function frameCount(sheet, a) {
  const cols = Math.max(1, Math.floor(sheet.w / a.fw));
  return Math.min(cols, a.durations.length || cols);
}

// Where the visible pixels of one facing are, over all its frames: { x, y, w, h } inside a frame.
export function rowBox(sheet, a, row) {
  const rows = Math.max(1, Math.floor(sheet.h / a.fh)), r = Math.min(row, rows - 1), n = frameCount(sheet, a);
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let f = 0; f < n; f++) for (let y = 0; y < a.fh; y++) for (let x = 0; x < a.fw; x++) {
    if (sheet.rgba[((r * a.fh + y) * sheet.w + f * a.fw + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? { x: 0, y: 0, w: a.fw, h: a.fh } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// One facing as an animated GIF, cropped to its visible pixels (so the GIF's bottom edge is the
// animal's feet and its middle is its body) and resized with nearest neighbour by `scale`.
export function rowToGif(sheet, a, row, scale) {
  const rows = Math.max(1, Math.floor(sheet.h / a.fh)), r = Math.min(row, rows - 1), n = frameCount(sheet, a);
  const box = rowBox(sheet, a, r), W = Math.max(1, Math.round(box.w * scale)), H = Math.max(1, Math.round(box.h * scale));
  const frames = [];
  for (let f = 0; f < n; f++) {
    const rgba = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      const sy = r * a.fh + box.y + Math.min(box.h - 1, Math.floor((y + 0.5) / scale));
      for (let x = 0; x < W; x++) {
        const sx = f * a.fw + box.x + Math.min(box.w - 1, Math.floor((x + 0.5) / scale)), s = (sy * sheet.w + sx) * 4, d = (y * W + x) * 4;
        rgba[d] = sheet.rgba[s]; rgba[d + 1] = sheet.rgba[s + 1]; rgba[d + 2] = sheet.rgba[s + 2]; rgba[d + 3] = sheet.rgba[s + 3];
      }
    }
    // durations are game ticks (1/60 s); GIF delays are 1/100 s
    frames.push({ rgba, delay: Math.max(2, Math.round(((a.durations[f] ?? 8) * 100) / 60)) });
  }
  return { bytes: encodeGif(frames, W, H), w: W, h: H };
}

// How big an animal stands (its Idle, facing the viewer), to bring every species to a similar size.
export function standHeight(idleSheet, idleAnim) { return rowBox(idleSheet, idleAnim, 0).h; }

const STEPS = [0.5, 0.6, 2 / 3, 0.75, 0.8, 0.9, 1, 1.25, 1.5];
export function normalScale(standH, stage) {
  const s = (stage === 3 ? 30 : 18) / standH;
  if (s > 0.88 && s < 1.15) return 1;
  let best = 1, d = 9;
  for (const v of STEPS) if (Math.abs(v - s) < d) { d = Math.abs(v - s); best = v; }
  return best;
}

export { decodePng };
