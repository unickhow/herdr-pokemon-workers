// strip.html (original characters)  ->  strip_starters.html (starters, stage 1 = sub-agent, stage 3 = agent)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let h = fs.readFileSync(path.join(ROOT, "prototype", "strip.html"), "utf8");

const LINES = [ // [gen, type, stage1, stage3, zh name of stage 3]
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
const AGENTS = ["claude", "codex", "opencode", "pi", "cursor", "gemini"];
const key = (l) => `g${l[0]}${l[1]}`;
const spec = LINES.map((l, i) => `    ${key(l)}: { name: "第${l[0]}世代${{ grass: "草", fire: "火", water: "水" }[l[1]]}", agent: "${AGENTS[i % 6]}", kid: ${l[2]}, big: ${l[3]}, o: "#222", b: "#999", d: "#777", D: "#555", h: "#bbb", l: "#eee", L: "#ccc", x: "#f4a", c: "#f4a", m: "#222", n: "#222", g: "#777" }`).join(",\n");

// 1. species table
const s0 = h.indexOf("  var SPECIES = {"), s1 = h.indexOf("  function palFor");
h = h.slice(0, s0) + "  var SPECIES = {\n" + spec + "\n  };\n" + h.slice(s1);
// 2. which starters appear in the demo data / cycling
const map = { fox: "g1fire", owl: "g3water", frog: "g1grass", axo: "g2fire", sheep: "g4grass", cat: "g5water" };
const b0 = h.indexOf("  function build() {"), b1 = h.indexOf("  var CYCLE");
let build = h.slice(b0, b1);
for (const [a, b] of Object.entries(map)) build = build.split(`mk("${a}"`).join(`mk(null`);
h = h.slice(0, b0) + build + h.slice(b1);
const order = LINES.map(key);
const mix = []; for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) mix.push(order[j * 9 % 27 + i] ?? order[i * 3 + j]);
h = h.replace(/var ORDER = \[[^\]]*\];/, "var ORDER = " + JSON.stringify(order.filter((_, i) => true).sort((a, b) => ((+a[1] * 7 + a.length) % 5) - ((+b[1] * 7 + b.length) % 5))) + ";");
h = h.replace('|| "fox"', '|| "g1fire"');
const mkAt = h.indexOf("  function mk(sp, state, idleMode, kids) {");
const helpers = `  var AGENT_NAMES = ["claude", "codex", "opencode", "pi", "cursor", "gemini"], agentSeq = 0, LINE_REG = [];
  // a new agent gets a random starter line (stage 3 = the agent, stage 1 = its sub-agents); lines nobody has yet come first
  function pickLine() {
    var keys = Object.keys(SPECIES), used = {};
    if (typeof items !== "undefined" && items && items.length) { LINE_REG = []; items.forEach(function (it) { it.cell.peers.forEach(function (p) { LINE_REG.push(p.sp); }); }); }
    LINE_REG.forEach(function (k) { used[k] = (used[k] || 0) + 1; });
    var min = Math.min.apply(null, keys.map(function (k) { return used[k] || 0; }));
    var pool = keys.filter(function (k) { return (used[k] || 0) === min; });
    return pool[Math.floor(Math.random() * pool.length)];
  }
`;
h = h.slice(0, mkAt) + helpers + h.slice(mkAt);
h = h.replace("function mk(sp, state, idleMode, kids) { return {", "function mk(sp, state, idleMode, kids) { if (!sp) sp = pickLine(); LINE_REG.push(sp); return {").replace("agent: SPECIES[sp].agent", "agent: AGENT_NAMES[(agentSeq++) % 6]");
h = h.replace('ORDER.filter(function (s) { return used.indexOf(s) < 0; })[0] || "g1fire"', "pickLine()");
h = h.replace("mk(ORDER[i % ORDER.length],", "mk(null,");
h = h.replace("var line = best < 50 ?", "var line = !TH.rake ? false : best < 50 ?");
// 3. manifest + override
h = h.replace('<script src="fx/manifest.js"></script>', '<script src="fx/manifest.js"></script>\n<script src="starters/manifest.js"></script>');
const over = fs.readFileSync(path.join(ROOT, "tools", "starters-override.js"), "utf8") + fs.readFileSync(path.join(ROOT, "tools", "scenes.js"), "utf8") + fs.readFileSync(path.join(ROOT, "tools", "export-hook.js"), "utf8");
const end = h.lastIndexOf("})();");
h = h.slice(0, end) + over + "\n" + h.slice(end);
h = h.replace("牧場列 · 原創角色版", "牧場列 · 御三家版").replace("角色是原創的正面四足動物和貓頭鷹,特效來自", "角色是各世代御三家:第一階段 = 子代理、第三階段 = agent(圖來自 PMD SpriteCollab,執行 tools/fetch-starters.mjs 下載),特效來自");
fs.writeFileSync(path.join(ROOT, "prototype", "strip_starters.html"), h);
console.log("ok", h.length);
