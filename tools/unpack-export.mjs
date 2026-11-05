// Unpacks the dump of prototype/strip_starters.html#export into mods/pokemon-workers/{scenes/*.png,campus.json}
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dom = fs.readFileSync(process.argv[2], "utf8");
const m = /<pre id="export">([\s\S]*?)<\/pre>/.exec(dom);
const txt = m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const data = JSON.parse(txt);
const out = path.join(ROOT, "mods", "pokemon-workers");
fs.mkdirSync(path.join(out, "scenes"), { recursive: true });
for (const [k, url] of Object.entries(data.scenes)) fs.writeFileSync(path.join(out, "scenes", k + ".png"), Buffer.from(url.split(",")[1], "base64"));
fs.writeFileSync(path.join(out, "campus.json"), JSON.stringify(data.layouts));
console.log(Object.keys(data.scenes).length, "scenes;", Object.entries(data.layouts).map(([b, l]) => `${b}:${l.CW}x${l.CH}`).join(" "));
