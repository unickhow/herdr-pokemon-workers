// Fetches and prepares the art. Nothing from SpriteCollab ships with this mod: on first use it downloads
// the sprite sheets (and their credits) it needs to ~/.config/herdr-app/data/pokemon-workers/ with curl,
// then cuts them into small animated GIFs itself (no ImageMagick needed).
import { exec, appHome } from "herdr";
import * as fs from "fs/promises";
import { LINE } from "./lines.js";
import { decodePng, parseAnimData, resolveAnim, rowToGif, standHeight, normalScale } from "./anim.js";

export const DATA_REL = "data/pokemon-workers";
const DATA = `${appHome()}/${DATA_REL}`;
const SRC = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master";
const SCALE = 2;                 // each source pixel becomes 2x2 screen pixels (times the species' own size factor)
const VERSION = 2;               // bump when the GIF recipe changes, so old caches are rebuilt

// What each status looks like, in SpriteCollab's animation names.
export const ANIM = { working: "Charge", done: "Hop", blocked: "Hurt", sleep: "Sleep", idle: "Idle", walk: "Walk" };
const pad = (n) => String(n).padStart(4, "0");
const exists = (p) => fs.exists(p).catch(() => false);

async function curl(pairs) {
  const args = ["-sfL", "--retry", "2", "--connect-timeout", "10"];
  for (const [file, url] of pairs) args.push("-o", file, url);
  const r = await exec("curl", args);
  if (r.code !== 0) throw new Error(`download failed (curl ${r.code}); is curl installed and are you online?`);
}

const gifSize = (b) => ({ w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) });

export class Sprites {
  constructor(onChange) {
    this.onChange = onChange;   // called when something new is ready
    this.ready = {};            // "id|name|row" -> { path, w, h }
    this.meta = {};             // dex number -> { norm, sheets } | "loading" | { error, at }
    this.queue = [];
    this.busy = false;
    this.failed = 0;
    this.preparing = {};        // dex number -> Promise of its meta
    this.active = 0;            // downloads running now (at most 4)
    this.waiting = [];
  }

  // Synchronous: what is ready now, or null (and it gets prepared in the background).
  peek(id, name, row = 0) {
    const key = `${id}|${name}|${row}`;
    if (this.ready[key]) return this.ready[key];
    this.ensure(id).catch(() => {});
    if (!this.queue.some((q) => q.key === key) && !this.pending?.has(key)) this.queue.push({ key, id, name, row });
    this.pump();
    return null;
  }

  async pump() {
    if (this.busy) return;
    this.busy = true;
    this.pending = this.pending ?? new Set();
    try {
      while (this.queue.length) {
        const job = this.queue.shift();
        this.pending.add(job.key);
        try {
          this.ready[job.key] = await this.build(job);
          this.onChange();
        } catch (e) {
          const m = this.meta[job.id];
          this.meta[job.id] = { error: String(e?.message ?? e), at: Date.now() };
          this.failed++;
          this.onChange();
        }
        this.pending.delete(job.key);
      }
    } finally { this.busy = false; }
  }

  // Species download side by side, a few at a time.
  ensure(id) {
    const cur = this.meta[id];
    if (cur && !cur.error) return Promise.resolve(cur);
    if (cur?.error && Date.now() - cur.at < 60000) return Promise.reject(new Error(cur.error));
    if (!this.preparing[id]) {
      this.preparing[id] = new Promise((resolve, reject) => {
        const go = () => {
          this.active++;
          this.prepare(id).then(resolve, reject).finally(() => {
            this.active--; delete this.preparing[id];
            const next = this.waiting.shift(); if (next) next();
          });
        };
        if (this.active < 4) go(); else this.waiting.push(go);
      });
    }
    return this.preparing[id];
  }

  // Downloads a species' sheets once and works out how big it should be drawn.
  async prepare(id) {
    const cur = this.meta[id];
    if (cur && !cur.error) return cur;
    if (cur?.error && Date.now() - cur.at < 60000) throw new Error(cur.error);
    const dir = `${DATA}/sprites/${pad(id)}`;
    await fs.mkdir(dir, { recursive: true });
    const xml = `${dir}/AnimData.xml`;
    if (!(await exists(xml))) await curl([[xml, `${SRC}/sprite/${pad(id)}/AnimData.xml`]]);
    const anims = parseAnimData(await fs.readFile(xml, "utf8"));
    const sheets = {};
    for (const name of Object.values(ANIM)) {
      const a = resolveAnim(anims, name) ?? (name === "Idle" ? null : resolveAnim(anims, "Idle"));
      if (a) sheets[name] = a;
    }
    const todo = [];
    for (const n of new Set(Object.values(sheets).map((a) => a.name))) if (!(await exists(`${dir}/${n}.png`))) todo.push([`${dir}/${n}.png`, `${SRC}/sprite/${pad(id)}/${n}-Anim.png`]);
    if (todo.length) await curl(todo);
    // the credits are best-effort: they are only needed to show who drew the art
    if (!(await exists(`${dir}/credits.txt`))) await curl([[`${dir}/credits.txt`, `${SRC}/sprite/${pad(id)}/credits.txt`]]).catch(() => {});
    const idle = sheets.Idle ?? sheets.Walk;
    const stage = LINE_STAGE(id);
    const norm = normalScale(standHeight(decodePng(new Uint8Array(await fs.readFile(`${dir}/${idle.name}.png`))), idle), stage);
    return (this.meta[id] = { norm, sheets, dir });
  }

  async build({ id, name, row }) {
    const m = await this.ensure(id);
    const file = `${m.dir}/${name}_${row}_v${VERSION}.gif`, rel = `${DATA_REL}/sprites/${pad(id)}/${name}_${row}_v${VERSION}.gif`;
    if (await exists(file)) { const b = await fs.readFile(file); return { path: rel, ...gifSize(b) }; }
    const a = m.sheets[name] ?? m.sheets.Idle;
    const sheet = decodePng(new Uint8Array(await fs.readFile(`${m.dir}/${a.name}.png`)));
    const g = rowToGif(sheet, a, row, m.norm * SCALE);
    await fs.writeFile(file, g.bytes);
    return { path: rel, w: g.w, h: g.h };
  }
}

function LINE_STAGE(id) {
  for (const k of Object.keys(LINE)) { if (LINE[k].big[0] === id) return 3; if (LINE[k].kid[0] === id) return 1; }
  return 3;
}

// ---- credits: who drew what, from the credits SpriteCollab keeps next to every sprite ----

export async function creditsReport(ids) {
  const names = {};
  const namesFile = `${DATA}/credit_names.txt`;
  if (!(await exists(namesFile))) { await fs.mkdir(DATA, { recursive: true }); await curl([[namesFile, `${SRC}/credit_names.txt`]]).catch(() => {}); }
  try {
    for (const line of (await fs.readFile(namesFile, "utf8")).split("\n").slice(1)) {
      const [name, discord, contact] = line.split("\t");
      if (discord) names[discord.trim()] = { name: (name || "").trim(), contact: (contact || "").trim() };
    }
  } catch {}
  const by = {};
  for (const id of ids) {
    let txt = "";
    try { txt = await fs.readFile(`${DATA}/sprites/${pad(id)}/credits.txt`, "utf8"); } catch { continue; }
    for (const line of txt.split("\n")) {
      const f = line.split("\t"); if (f.length < 4) continue;
      const who = f[1].trim(), info = names[who];
      const name = who === "CHUNSOFT" ? "Spike Chunsoft (original game sprites)" : (info?.name || who);
      const contact = who === "CHUNSOFT" ? "" : (/^https?:/.test(info?.contact ?? "") ? info.contact : "");
      const e = (by[name] ??= { name, contact, licenses: new Set(), count: 0 });
      e.licenses.add(f[3].trim()); e.count++;
    }
  }
  return Object.values(by).map((e) => ({ ...e, licenses: [...e.licenses] })).sort((a, b) => b.count - a.count);
}
