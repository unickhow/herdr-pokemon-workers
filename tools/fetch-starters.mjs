// Fetches PMDCollad/SpriteCollab sprite sheets for the starters of every generation
// (stage 1 = sub-agent, stage 3 = agent) into ../starters/<dex>/ and writes ../starters/manifest.js.
// Run: node tools/fetch-starters.mjs      (needs network; files are cached)
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "starters");
const BASE = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite";
const WANT = ["Walk", "Idle", "Sleep", "Pose", "Hop", "Charge", "Hurt", "Eat"];
const EXTRA = { 157: ["Shoot"] };   // per-species extras (Typhlosion works with a fire Shoot)

// [gen, type, stage1, stage3]   (national dex numbers)
const STARTERS = [
  [1, "grass", 1, 3], [1, "fire", 4, 6], [1, "water", 7, 9],
  [2, "grass", 152, 154], [2, "fire", 155, 157], [2, "water", 158, 160],
  [3, "grass", 252, 254], [3, "fire", 255, 257], [3, "water", 258, 260],
  [4, "grass", 387, 389], [4, "fire", 390, 392], [4, "water", 393, 395],
  [5, "grass", 495, 497], [5, "fire", 498, 500], [5, "water", 501, 503],
  [6, "grass", 650, 652], [6, "fire", 653, 655], [6, "water", 656, 658],
  [7, "grass", 722, 724], [7, "fire", 725, 727], [7, "water", 728, 730],
  [8, "grass", 810, 812], [8, "fire", 813, 815], [8, "water", 816, 818],
  [9, "grass", 906, 908], [9, "fire", 909, 911], [9, "water", 912, 914],
];

const pad = (n) => String(n).padStart(4, "0");
async function get(url, file, binary) {
  try { await fs.access(file); return true; } catch {}
  const r = await fetch(url);
  if (!r.ok) return false;
  await fs.writeFile(file, Buffer.from(await r.arrayBuffer()));
  return true;
}

function parse(xml) {
  const anims = {};
  for (const m of xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)) {
    const b = m[1], g = (t) => b.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1];
    const name = g("Name"); if (!name) continue;
    anims[name] = { copyOf: g("CopyOf") ?? null, fw: +g("FrameWidth") || 0, fh: +g("FrameHeight") || 0,
      dur: [...b.matchAll(/<Duration>(\d+)<\/Duration>/g)].map((d) => +d[1]) };
  }
  return anims;
}
const resolve = (an, n) => { let a = an[n]; for (let i = 0; a?.copyOf && i < 4; i++) a = an[a.copyOf]; return a && a.fw ? { ...a, sheet: a === an[n] ? n : Object.keys(an).find((k) => an[k] === a) } : null; };

const manifest = [];
for (const [gen, type, s1, s3] of STARTERS) {
  for (const [stage, id] of [[1, s1], [3, s3]]) {
    const dir = path.join(ROOT, pad(id));
    await fs.mkdir(dir, { recursive: true });
    if (!(await get(`${BASE}/${pad(id)}/AnimData.xml`, path.join(dir, "AnimData.xml")))) { console.log("skip", id); continue; }
    const an = parse(await fs.readFile(path.join(dir, "AnimData.xml"), "utf8"));
    const entry = { id, gen, type, stage, anims: {} };
    for (const w of [...WANT, ...(EXTRA[id] || [])]) {
      const a = resolve(an, w); if (!a) continue;
      const sheet = a.sheet;
      if (!(await get(`${BASE}/${pad(id)}/${sheet}-Anim.png`, path.join(dir, `${sheet}.png`)))) continue;
      entry.anims[w] = { file: `starters/${pad(id)}/${sheet}.png`, fw: a.fw, fh: a.fh, dur: a.dur };
    }
    manifest.push(entry);
    console.log(gen, type, stage, id, Object.keys(entry.anims).join(","));
  }
}
await fs.writeFile(path.join(ROOT, "manifest.js"), "window.STARTERS = " + JSON.stringify(manifest) + ";\n");
console.log("done:", manifest.length, "species");
