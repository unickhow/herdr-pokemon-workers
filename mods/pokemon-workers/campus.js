// The campus: a big picture of a place where every agent lives. Working agents sit at a desk, idle ones
// wander the park, tired ones sleep on a mat, finished ones wait at the notice board, blocked ones
// at the help stall. Sub-agents follow their agent around. The scene follows the computer's clock.
import { div, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { run, readTextFile, appHome, closeOverlay, props } from "herdr";
import { ANIM } from "./sprites.js";
import { LINE } from "./lines.js";
import { focusPeer, saveScene, savedScene } from "./model.js";

export const MOD = "pokemon-workers";
export const SCENES = [
  { key: "zen", name: "Zen garden" },
  { key: "meadow", name: "Meadow" },
  { key: "greenhouse", name: "Greenhouse" },
  { key: "snow", name: "Snow lodge" },
  { key: "beach", name: "Beach hut" },
];
const BUCKETS = [8, 16, 32];
const SPEED = { big: 34, kid: 40 };      // canvas px per second
const bucketFor = (n) => BUCKETS.find((b) => n <= b) ?? BUCKETS[BUCKETS.length - 1];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const hex2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");

// ---- the nav grid (6px cells), A* with string pulling ----

class Nav {
  constructor(L) {
    this.G = L.G; this.GW = L.GW; this.GH = L.GH;
    this.blocked = new Uint8Array(L.GW * L.GH);
    let i = 0; for (let k = 0; k < L.grid.length; k += 2) { this.blocked.fill(L.grid[k], i, i + L.grid[k + 1]); i += L.grid[k + 1]; }
  }
  free(cx, cy) { return cx >= 0 && cy >= 0 && cx < this.GW && cy < this.GH && !this.blocked[cy * this.GW + cx]; }
  freeAt(x, y) { return this.free(Math.floor(x / this.G), Math.floor(y / this.G)); }
  nearest(cx, cy) {
    if (this.free(cx, cy)) return [cx, cy];
    for (let r = 1; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.free(cx + dx, cy + dy)) return [cx + dx, cy + dy];
    return null;
  }
  line(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 2.5);
    for (let i = 1; i < n; i++) { const u = i / n; if (!this.freeAt(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u)) return false; }
    return true;
  }
  // corners to walk through, from (sx,sy) to (tx,ty); null when there is no way
  path(sx, sy, tx, ty) {
    const G = this.G, GW = this.GW, s = this.nearest(Math.floor(sx / G), Math.floor(sy / G)), t = this.nearest(Math.floor(tx / G), Math.floor(ty / G));
    if (!s || !t) return null;
    const n = GW * this.GH, gs = new Float32Array(n).fill(1e9), came = new Int32Array(n).fill(-1), done = new Uint8Array(n);
    const si = s[1] * GW + s[0], ti = t[1] * GW + t[0], heap = [];
    const hh = (i) => { const dx = Math.abs((i % GW) - t[0]), dy = Math.abs(((i / GW) | 0) - t[1]); return dx + dy - 0.586 * Math.min(dx, dy); };
    const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } }
      return top[1];
    };
    gs[si] = 0; push(si, hh(si));
    let found = false;
    while (heap.length) {
      const cur = pop(); if (done[cur]) continue; done[cur] = 1;
      if (cur === ti) { found = true; break; }
      const cx = cur % GW, cy = (cur / GW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy; if (!this.free(nx, ny)) continue;
        if (dx && dy && (!this.free(cx + dx, cy) || !this.free(cx, cy + dy))) continue;      // no cutting corners
        const ni = ny * GW + nx, cost = gs[cur] + (dx && dy ? 1.414 : 1);
        if (cost < gs[ni]) { gs[ni] = cost; came[ni] = cur; push(ni, cost + hh(ni)); }
      }
    }
    if (!found) return null;
    const cells = []; for (let k = ti; k !== -1; k = came[k]) cells.push(k); cells.reverse();
    const pts = cells.map((i) => [(i % GW) * G + G / 2, ((i / GW) | 0) * G + G / 2]);
    pts[0] = [sx, sy]; if (this.freeAt(tx, ty)) pts[pts.length - 1] = [tx, ty];
    const out = [pts[0]]; let i = 0;
    while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !this.line(pts[i][0], pts[i][1], pts[j][0], pts[j][1])) j--; out.push(pts[j]); i = j; }
    out.shift(); return out;
  }
}

// ---- time of day, from the computer's clock ----

export function timeOfDay(h) {
  const L = smooth(5.3, 7.6, h) * (1 - smooth(17.2, 19.6, h)), warm = Math.max(0, 1 - Math.abs(h - 6.4) / 1.3, 1 - Math.abs(h - 18.3) / 1.5);
  return { L, warm, name: L < 0.12 ? "Night" : warm > 0.25 ? (h < 12 ? "Dawn" : "Dusk") : "Day" };
}
const clockHours = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };

const zoneOf = (mood) => (mood === "working" ? "desk" : mood === "done" ? "board" : mood === "blocked" ? "help" : mood === "sleep" ? "mat" : "wander");

export class Campus {
  constructor(host) {
    this.host = host;
    this.layouts = null; this.bucket = 0; this.nav = null; this.L = null;
    this.actors = {}; this.taken = {}; this.last = 0; this.hot = null; this.stageW = 900; this.stageH = 600; this.error = null;
    this.load();
  }

  async load() {
    try {
      const txt = await readTextFile(`${appHome()}/mods/${MOD}/campus.json`);
      this.layouts = JSON.parse(txt);
    } catch (e) { this.error = String(e?.message ?? e); }
    this.host.dirty = true;
  }

  setBucket(b) {
    this.bucket = b; this.L = this.layouts[b]; this.nav = new Nav(this.L); this.taken = {};
    for (const a of Object.values(this.actors)) { a.zone = null; a.spot = null; a.path = null; a.arrived = false; }
  }

  spots(zone) { const L = this.L; return zone === "desk" ? L.desks : zone === "board" ? L.reception : zone === "help" ? L.help : zone === "mat" ? L.mats : null; }
  release(a) { if (a.spot && this.taken[a.spot] === a.key) delete this.taken[a.spot]; a.spot = null; }
  claim(a, zone) {
    this.release(a);
    const spots = this.spots(zone);
    if (!spots) {                                     // wander: somewhere in the park
      const P = this.L.park;
      for (let i = 0; i < 30; i++) { const x = P.x0 + Math.random() * (P.x1 - P.x0), y = P.y0 + Math.random() * (P.y1 - P.y0); if (this.nav.freeAt(x, y)) return [x, y]; }
      return [(P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2];
    }
    for (let i = 0; i < spots.length; i++) { const k = `${zone}:${i}`; if (!this.taken[k] || this.taken[k] === a.key) { this.taken[k] = a.key; a.spot = k; return spots[i].slice(); } }
    const s0 = spots[spots.length - 1];             // full: wait nearby in the open
    for (let i = 0; i < 30; i++) { const x = s0[0] + (Math.random() - 0.5) * 100, y = s0[1] + 20 + Math.random() * 24; if (this.nav.freeAt(x, y)) return [x, y]; }
    return s0.slice();
  }

  goto(o, x, y) { o.dest = [x, y]; o.path = this.nav.path(o.x, o.y, x, y) ?? [[x, y]]; o.arrived = false; }

  // moves o along its path; returns true when it moved
  walk(o, speed, dt) {
    if (!o.path || !o.path.length) { if (!o.arrived) o.arrived = true; return false; }
    let left = speed * dt, moved = false;
    while (left > 0 && o.path.length) {
      const [tx, ty] = o.path[0], dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
      if (d < 0.5) { o.path.shift(); continue; }
      const step = Math.min(left, d);
      o.x += (dx / d) * step; o.y += (dy / d) * step; left -= step; moved = true;
      if (Math.abs(dy) > 1.6 * Math.abs(dx)) o.row = dy > 0 ? 0 : 4; else o.row = dx > 0 ? 2 : 6;
      if (d - step < 0.5) o.path.shift();
    }
    if (!o.path.length) o.arrived = true;
    o.walking = moved;
    return moved;
  }

  // One step of the world. Returns true when something on screen changed.
  tick(now) {
    if (!this.layouts) return false;
    const peers = this.host.model.flatMap((s) => s.peers.map((p) => ({ ...p, space: s.name })));
    const b = bucketFor(peers.length);
    if (b !== this.bucket) this.setBucket(b);
    const dt = this.last ? clamp((now - this.last) / 1000, 0, 0.5) : 0.15; this.last = now;
    let changed = false;
    const alive = new Set(peers.map((p) => p.key));
    for (const k of Object.keys(this.actors)) if (!alive.has(k)) { this.release(this.actors[k]); delete this.actors[k]; changed = true; }
    const gate = this.L.gate;
    for (const p of peers) {
      let a = this.actors[p.key];
      if (!a) { a = this.actors[p.key] = { key: p.key, x: gate.x + (Math.random() - 0.5) * 24, y: gate.y - 4 - Math.random() * 12, row: 0, zone: null, spot: null, path: null, arrived: false, kids: [], wanderAt: 0 }; changed = true; }
      a.p = p;
      const zone = zoneOf(p.mood);
      if (a.zone !== zone) { a.zone = zone; const [x, y] = this.claim(a, zone); this.goto(a, x, y); a.wanderAt = now + 3000 + Math.random() * 6000; changed = true; }
      else if (zone === "wander" && a.arrived && now > a.wanderAt) { const [x, y] = this.claim(a, zone); this.goto(a, x, y); a.wanderAt = now + 5000 + Math.random() * 8000; changed = true; }
      if (this.walk(a, SPEED.big, dt)) changed = true; else a.walking = false;
      // sub-agents keep close to their agent
      while (a.kids.length < p.kids.length) a.kids.push({ x: a.x - 10 - a.kids.length * 8, y: a.y + 2, row: 0, path: null, arrived: true, repath: 0 });
      a.kids.length = p.kids.length;
      p.kids.forEach((kd, j) => {
        const o = a.kids[j]; o.mood = kd.mood;
        const side = (j % 2 ? 1 : -1) * (14 + 10 * (j >> 1)), tx = a.x + side, ty = a.y + 2;
        if (Math.hypot(tx - o.x, ty - o.y) > 16 && now > o.repath) { this.goto(o, tx, ty); o.repath = now + 700; }
        if (this.walk(o, SPEED.kid, dt)) changed = true; else o.walking = false;
      });
    }
    return changed;
  }

  // ---- drawing ----

  sprite(t, id, anim, row, k, key, flip) {
    const g = this.host.sprites.peek(id, anim, row);
    if (!g) return null;
    return { g, w: g.w * k, h: g.h * k };
  }

  render(t) {
    const host = this.host, now = Date.now(), model = host.model;
    const peers = model.flatMap((s) => s.peers.map((p) => ({ ...p, space: s.name })));
    const counts = { working: 0, idle: 0, sleep: 0, done: 0, blocked: 0 };
    for (const p of peers) counts[p.mood] = (counts[p.mood] || 0) + 1;
    const want = (host.demo && props()?.scene) || savedScene(), scene = SCENES.some((s) => s.key === want) ? want : "zen";
    const tod = timeOfDay(clockHours());
    const bar = h_flex().h(40).flex_none().px(14).gap(14).items_center().border_b_1().border_color(t.border)
      .child(div().font_semibold().text_size(13).text_color(t.foreground).child("Campus"))
      .child(div().text_size(11.5).text_color(t.muted).child(`${peers.length} agents · ${counts.working} working · ${counts.idle + counts.sleep} resting · ${counts.done} done · ${counts.blocked} need you · ${tod.name}`))
      .child(div().flex_1())
      .child(h_flex().gap(4).children(SCENES.map((s) =>
        div().id(`scene-${s.key}`).px(8).py(3).rounded(6).text_size(11).cursor_pointer().border_1()
          .border_color(s.key === scene ? t.accent : t.border).text_color(s.key === scene ? t.foreground : t.muted)
          .bg(s.key === scene ? t.selected : "#00000000").hover((e) => e.bg(t.hover))
          .on_click(() => saveScene(s.key)).child(s.name))))
      .child(div().id("campus-credits").px(8).py(3).rounded(6).text_size(11).cursor_pointer().border_1().border_color(t.border).text_color(t.muted).hover((e) => e.bg(t.hover))
        .on_click(() => host.openCredits()).child("Credits"))
      .child(div().id("campus-close").px(8).py(3).rounded(6).text_size(11).cursor_pointer().border_1().border_color(t.border).text_color(t.muted).hover((e) => e.bg(t.hover))
        .on_click(() => closeOverlay(props().overlay)).child("Close"));

    const body = div().id("campus-stage").flex_1().min_h(0).min_w(0).relative().overflow_hidden().bg(t.background)
      .on_size_change((size, cx) => {
        if (Math.abs(size.width - this.stageW) > 1 || Math.abs(size.height - this.stageH) > 1) { this.stageW = size.width; this.stageH = size.height; cx.notify(); }
      });
    if (!this.layouts) return v_flex().size_full().bg(t.popover).child(bar).child(body.child(div().p(20).text_size(12).text_color(t.muted).child(this.error ? `Couldn't load the campus: ${this.error}` : "Loading…")));
    const L = this.L, z = clamp(Math.min(this.stageW / L.CW, this.stageH / L.CH), 0.5, 2), k = z / 2;
    const W = L.CW * z, H = L.CH * z, ox = Math.max(0, (this.stageW - W) / 2), oy = Math.max(0, (this.stageH - H) / 2);
    const world = div().absolute().left(ox).top(oy).w(W).h(H).overflow_hidden()
      .child(image(`mods/${MOD}/scenes/${scene}_${this.bucket}.png`).absolute().left(0).top(0).w(W).h(H));

    // everyone, back to front
    const items = [];
    for (const p of peers) {
      const a = this.actors[p.key]; if (!a) continue;
      a.kids.forEach((o, j) => items.push({ y: o.y, f: () => this.kid(t, a, o, p.kids[j], z, k) }));
      items.push({ y: a.y, f: () => this.big(t, a, p, z, k) });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) world.child(it.f());

    // night and dusk: colour laid over everything
    const night = (1 - tod.L) * 0.55, warm = tod.warm * 0.16;
    if (night > 0.01) world.child(div().absolute().left(0).top(0).w(W).h(H).bg(`#0c1234${hex2(night * 255)}`));
    if (warm > 0.01) world.child(div().absolute().left(0).top(0).w(W).h(H).bg(`#ff8c46${hex2(warm * 255)}`));
    body.child(world);
    return v_flex().size_full().bg(t.popover).child(bar).child(body);
  }

  // an anchor that glides to (x, y); the picture hangs from it, feet at the anchor
  anchor(x, y, z) {
    return div().absolute().left(x * z).top(y * z).w(0).h(0)
      .transition("left", { duration: 170, easing: "linear" }).transition("top", { duration: 170, easing: "linear" });
  }

  big(t, a, p, z, k) {
    const id = LINE[p.line].big[0], walking = a.walking && !a.arrived;
    const anim = walking ? ANIM.walk : (ANIM[p.mood] ?? ANIM.idle), row = walking ? a.row : 0;
    const s = this.sprite(t, id, anim, row, k);
    const anchor = this.anchor(a.x, a.y, z).id(`actor-${a.key}`);
    if (!s) return anchor.child(div().absolute().left(-8).top(-18).w(16).h(18).rounded_full().bg(t.muted).loop("opacity", { from: 0.3, to: 0.8, period: 900 }));
    const hot = this.hot === a.key;
    anchor.child(image(s.g.path).id(`sprite-${a.key}`).absolute().left(-s.w / 2).top(-s.h).w(s.w).h(s.h)
      .cursor_pointer().on_hover((h, cx) => { const n = h ? a.key : this.hot === a.key ? null : this.hot; if (n !== this.hot) { this.hot = n; cx.notify(); } })
      .on_click(() => { focusPeer(run, p); closeOverlay(props().overlay); }));
    if (!walking && p.mood === "sleep") anchor.child(image(`mods/${MOD}/fx/sleep.gif`).absolute().left(8 * k).top(-s.h - 6 * k));
    if (!walking && p.mood === "blocked") anchor.child(image(`mods/${MOD}/fx/alert.gif`).absolute().left(-15).top(-s.h - 28));
    if (hot) anchor.child(div().absolute().left(-70).top(4).w(140).flex().justify_center()
      .child(div().px(6).py(2).rounded(5).bg(t.background).border_1().border_color(t.border).text_size(10.5).text_color(t.foreground).whitespace_nowrap()
        .child(`${LINE[p.line].big[1]} · ${p.label} · ${p.space}`)));
    return anchor;
  }

  kid(t, a, o, kd, z, k) {
    const id = LINE[a.p.line].kid[0], walking = o.walking && !o.arrived;
    const anim = walking ? ANIM.walk : (ANIM[kd?.mood] ?? ANIM.idle), row = walking ? o.row : 0;
    const s = this.sprite(t, id, anim, row, k);
    const anchor = this.anchor(o.x, o.y, z);
    if (!s) return anchor;
    return anchor.child(image(s.g.path).id(`sprite-${a.key}`).absolute().left(-s.w / 2).top(-s.h).w(s.w).h(s.h));
  }
}
