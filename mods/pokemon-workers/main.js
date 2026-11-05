// Pokémon Workers: every agent is a starter Pokémon (its sub-agents are the first stage of the same line).
// A strip across the top shows one cell per space; "Campus" opens a place where they all live.
import { View, div, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, run, props, openOverlay, closeOverlay, nextCommand, spaces, knownAgents, shared, setShared } from "herdr";
import { LINE, sid } from "./lines.js";
import { Sprites, ANIM, creditsReport } from "./sprites.js";
import { buildModel, demoModel, ensureLines, focusPeer, savedScene, saveScene } from "./model.js";
import { Campus, MOD, SCENES } from "./campus.js";

const fx = (name) => `mods/${MOD}/fx/${name}.gif`;
const LABEL_H = 14;
const NEW_KNOWN = "new-menu.agents";        // the agents Herdr's own "+" menu last found, per machine: reused as a head start
const FLOOR_H = LABEL_H + 8;                 // the floor the animals stand on, with their names on it
// sky bands (top, middle, bottom), grass line and grass edge, for each mood of a cell
const MOODS = {
  working: { s: ["#2a4a6e", "#35597f", "#41698f"], g: ["#6bcf6b", "#48a84e"] },
  idle: { s: ["#2c3558", "#38426a", "#44507a"], g: ["#5bb064", "#3f8d4c"] },
  sleep: { s: ["#0f1328", "#151b37", "#1c2343"], g: ["#2d6a55", "#215043"] },
  done: { s: ["#4a3a6a", "#6a4c78", "#8c5c80"], g: ["#7fd16b", "#4fa853"] },
  blocked: { s: ["#45202f", "#58283a", "#6a3045"], g: ["#6a9a4a", "#4b7a3a"] },
};
const STARS = [[12, 30], [40, 38], [70, 27], [98, 41], [126, 31], [154, 38], [184, 28], [214, 36]];   // below the name row

export default class PokemonWorkers extends View {
  init(_p, cx) {
    const pr = props() ?? {};
    this.view = pr.menu ? "menu" : pr.campus ? "campus" : pr.credits ? "credits" : "strip";
    this.demo = !!pr.demo;
    this.hover = null;
    this.dirty = false;
    this.sig = "";
    this.sprites = new Sprites(() => { this.dirty = true; });
    this.model = this.snapshot();
    this.report = null;
    if (this.view === "campus") this.campus = new Campus(this);
    if (this.view === "credits") this.loadCredits();
    if (this.view === "menu") return this.initMenu(cx);
    cx.timer.every(this.view === "campus" ? 170 : 500, (cx) => this.tick(cx));
    // keys.json: "alt-shift-p": "pokemon-workers.campus", "alt-shift-o": "pokemon-workers.scene"
    if (this.view === "strip") {
      cx.spawn(async () => { for (;;) { const c = await nextCommand(); if (c === "campus") this.openCampus(); if (c === "scene") this.nextScene(); if (c === "credits") this.openCredits(); } });
    }
  }

  // ---- right-click on a cell: add an agent to that space ----

  initMenu(cx) {
    const pr = props() ?? {}, machine = spaces().find((x) => x.id === pr.space)?.machine ?? null;
    this.where = machine ?? "";
    this.agents = shared(NEW_KNOWN)?.[this.where] ?? [];
    cx.spawn(async (cx) => {
      try {
        this.agents = await knownAgents({ on: machine });
        setShared(NEW_KNOWN, { ...shared(NEW_KNOWN), [this.where]: this.agents });
      } catch { this.failed = true; }
      cx.notify();
    });
  }

  openMenu(s) {
    if (this.demo) return;
    const machine = spaces().find((x) => x.id === s.id)?.machine ?? null;
    const known = shared(NEW_KNOWN)?.[machine ?? ""];
    const rows = 1 + (known ? known.filter((a) => a.installed).length : 5);
    openOverlay({ mod: MOD, kind: "popup", width: 230, height: Math.min(440, 34 + 31 * Math.max(2, rows)), props: { menu: true, space: s.id, name: s.name } });
  }

  renderMenu() {
    const t = theme(), pr = props() ?? {}, installed = (this.agents ?? []).filter((a) => a.installed);
    const row = (id, name, on) => h_flex().id(id).h(31).flex_none().px(9).rounded(7).items_center().cursor_pointer().text_color(t.foreground)
      .hover((e) => e.bg(t.selected)).on_click(() => { closeOverlay(pr.overlay); on(); }).child(div().flex_1().min_w(0).truncate().child(name));
    return v_flex().id("pw-menu").size_full().min_h(0).bg(t.popover).p(5).text_size(12.8)
      .child(div().flex_none().h(24).px(9).text_size(11).text_color(t.dim).truncate().child(`Add to ${pr.name ?? "this space"}`))
      .child(row("pw-new-terminal", "Terminal", () => run("tab.new", { space: pr.space })))
      .children(installed.map((a, i) => row(`pw-new-${i}`, a.name, () => run("tab.new", { name: a.name, space: pr.space, argv: a.run }))))
      .when(!this.agents?.length && !this.failed, (e) => e.child(div().px(9).py(6).text_size(11).text_color(t.dim).child("Looking for agents…")))
      .when(this.failed, (e) => e.child(div().px(9).py(6).text_size(11).text_color(t.dim).child("Couldn't list agents")));
  }

  snapshot() { return this.demo ? demoModel() : buildModel(Date.now()); }

  tick(cx) {
    this.model = this.snapshot();
    if (!this.demo) ensureLines(this.model.flatMap((s) => s.peers.map((p) => p.key)), this.model.flatMap((s) => s.peers.flatMap((p) => p.kids.map((k) => k.key))));
    let changed = this.dirty; this.dirty = false;
    if (this.campus) changed = this.campus.tick(Date.now()) || changed;
    else {
      const sig = JSON.stringify(this.model);     // time passing can put an agent to sleep: redraw only then
      if (sig !== this.sig) { this.sig = sig; changed = true; }
    }
    if (changed) cx.notify();
  }

  openCampus() {
    openOverlay({ mod: MOD, kind: "dialog", width: 0.94, height: 0.92, props: { campus: true, demo: this.demo } });
  }
  nextScene() {
    const i = SCENES.findIndex((s) => s.key === savedScene());
    saveScene(SCENES[(i + 1) % SCENES.length].key);
  }
  openCredits() {
    openOverlay({ mod: MOD, kind: "dialog", width: 660, height: 600, props: { credits: true, demo: this.demo } });
  }

  async loadCredits() {
    const ids = [];
    for (const s of this.model) for (const p of s.peers) { ids.push(sid(LINE[p.line].big[0], p.shiny), ...p.kids.map((k) => sid(LINE[p.line].kid[0], k.shiny))); if (!p.kids.length) ids.push(LINE[p.line].kid[0]); }
    this.report = await creditsReport([...new Set(ids)]);
    this.dirty = true;
  }

  render(cx) {
    this.model = this.snapshot();
    if (this.view === "menu") return this.renderMenu();
    if (this.view === "campus") return this.campus.render(theme());
    if (this.view === "credits") return this.renderCredits();
    return this.renderStrip();
  }

  // ---- the strip: one cell per space ----

  sprite(id, mood, t) {
    const g = this.sprites.peek(id, ANIM[mood] ?? ANIM.idle, 0);
    return g ? { g } : null;
  }

  renderStrip() {
    const t = theme(), model = this.model;
    const root = h_flex().id("pw-strip").size_full().bg(t.chrome).overflow_hidden();
    if (!model.length) {
      root.child(div().flex_1().flex().items_center().justify_center().text_size(12).text_color(t.dim).child("No spaces yet."));
    }
    for (const s of model) root.child(this.cell(t, s));
    root.child(
      v_flex().w(76).flex_none().h_full().items_center().justify_center().gap(6).border_l_1().border_color(t.border)
        .child(this.button(t, "campus", "Campus", () => this.openCampus()))
        .child(this.button(t, "credits", "Credits", () => this.openCredits())),
    );
    return root;
  }

  button(t, id, text, on) {
    return div().id(`pw-${id}`).px(8).py(3).rounded(6).text_size(11).cursor_pointer().border_1().border_color(t.border).text_color(t.muted)
      .hover((e) => e.bg(t.hover)).on_click(on).child(text);
  }

  // How the cell looks: working = a bright day, done = sunset, blocked = a red dusk,
  // idle = evening, everyone asleep (or nobody there) = night.
  cellMood(s) {
    if (s.status === "working" || s.status === "blocked" || s.status === "done") return s.status;
    return s.peers.length && !s.peers.every((p) => p.mood === "sleep") ? "idle" : "sleep";
  }

  scenery(mood) {
    const m = MOODS[mood];
    const bg = v_flex().absolute().inset_0().overflow_hidden()
      .child(div().flex_none().h(30).bg(m.s[0])).child(div().flex_none().h(30).bg(m.s[1])).child(div().flex_1().bg(m.s[2]))
      .child(div().flex_none().h(3).bg(m.g[0])).child(div().flex_none().h(2).bg(m.g[1]))
      .child(v_flex().flex_none().h(FLOOR_H).bg("#262533")                         // planks: a light edge, then three bands
        .child(div().flex_none().h(1).bg("#454460")).child(div().flex_none().h(7).bg("#34334a"))
        .child(div().flex_none().h(7).bg("#2a2939")).child(div().flex_1().bg("#34334a")));
    if (mood === "working") bg.child(div().absolute().top(8).right(12).size(11).rounded_full().bg("#ffe27a"));
    if (mood === "done") bg.child(div().absolute().right(20).bottom(FLOOR_H + 4).w(20).h(10).rounded_t(10).bg("#ffb36b"));
    if (mood === "sleep") {
      bg.child(div().absolute().top(7).right(12).size(11).rounded_full().bg("#e9ecff"));
      for (const [x, y] of STARS) bg.child(div().absolute().left(x).top(y).size(2).bg("#d6dcffcc"));
    }
    return bg;
  }

  cell(t, s) {
    const shown = s.peers.slice(0, 3), extra = s.peers.length - shown.length, mood = this.cellMood(s);
    return v_flex().id(`pw-cell-${s.id}`).relative().flex_1().min_w(0).h_full().border_r_1().border_color(t.border).overflow_hidden()
      .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); this.openMenu(s); })
      .child(this.scenery(mood))
      .child(
        h_flex().h(22).flex_none().px(8).gap(5).items_center()
          .child(div().flex_none().size(6).rounded_full().bg(t[s.status] ?? t.dim))
          .child(div().min_w(0).truncate().text_size(11).text_color("#e6ebffdd").child(s.name))
          .when(extra > 0, (el) => el.child(div().flex_none().text_size(10).text_color("#b8c0e0").child(`+${extra}`))),
      )
      .child(
        h_flex().flex_1().min_h(0).px(6).pb(4).gap(6).items_end().justify_around().overflow_hidden()
          .when(shown.length === 0, (el) => el.child(div().pb(LABEL_H + 1).child(image(fx("ball")).w(44).h(32))))   // empty: a Poké Ball rocking on the floor
          .children(shown.map((p) => this.peer(t, p))),
      )
      .when(s.active, (el) => el.child(div().absolute().inset_0().border_1().border_color(t.accent)));
  }

  // A soft light behind the animal whose agent you are working in: three ellipses, brighter toward the middle, breathing slowly.
  glow(w, h) {
    const layer = (kx, ky, color) => div().absolute().left(w / 2 - (w * kx) / 2).top(h / 2 - (h * ky) / 2).w(w * kx).h(h * ky).rounded_full().bg(color);
    return div().absolute().left(0).top(0).w(w).h(h).loop("opacity", { from: 0.6, to: 1, period: 2200 })
      .child(layer(2.1, 1.35, "#ffe08a1c")).child(layer(1.6, 1.08, "#ffe08a2e")).child(layer(1.12, 0.84, "#fff3c048"));
  }

  peer(t, p) {
    const line = LINE[p.line], big = this.sprite(sid(line.big[0], p.shiny), p.mood, t);
    const kids = p.kids.slice(0, 2), extra = p.kids.length - kids.length;
    const hovered = this.hover === p.key;
    const body = h_flex().items_end().gap(2);
    if (big) {
      body.child(
        div().relative().flex_none().w(big.g.w).h(big.g.h)
          .when(p.focused, (el) => el.child(this.glow(big.g.w, big.g.h)))
          .child(image(big.g.path).w(big.g.w).h(big.g.h))
          .when(p.shiny, (el) => el.child(image(fx("shine")).absolute().left(-4).top(-2)))
          .when(p.mood === "sleep", (el) => el.child(image(fx("sleep")).absolute().left(big.g.w - 10).top(-8)))
          .when(p.mood === "blocked", (el) => el.child(image(fx("alert")).absolute().left(big.g.w / 2 - 15).top(-22))),
      );
    } else {
      body.child(div().flex_none().w(34).h(40).rounded_full().bg(t.muted).loop("opacity", { from: 0.25, to: 0.7, period: 900 }));
    }
    if (kids.length) {
      body.child(div().flex_none().w(8).h(1).bg(t.dim).mb(16));          // the leash: this one belongs to the big one
      for (const k of kids) {
        const s = this.sprite(sid(line.kid[0], k.shiny), k.mood, t);
        body.child(s ? div().relative().flex_none().w(s.g.w).h(s.g.h).child(image(s.g.path).w(s.g.w).h(s.g.h)).when(k.shiny, (el) => el.child(image(fx("shine")).absolute().left(-6).top(-4))) : div().flex_none().w(20).h(22).rounded_full().bg(t.dim));
      }
      if (extra > 0) body.child(div().flex_none().text_size(10).text_color(t.dim).mb(4).child(`+${extra}`));
    }
    return v_flex().id(`pw-peer-${p.key}`).flex_none().items_center().cursor_pointer()
      .on_hover((h, cx) => { const n = h ? p.key : this.hover === p.key ? null : this.hover; if (n !== this.hover) { this.hover = n; cx.notify(); } })
      .on_click(() => focusPeer(run, p))
      .child(body)
      .child(div().w_full().h(1))
      .child(div().h(LABEL_H).max_w(150).truncate().text_size(10).text_color(hovered ? t.foreground : t.dim)
        .child((p.shiny ? "✦ " : "") + (hovered ? `${line.big[1]} · ${p.label}` : line.big[1])));
  }

  // ---- credits ----

  renderCredits() {
    const t = theme(), r = this.report;
    const para = (txt) => div().text_size(11.5).text_color(t.muted).child(txt);
    return v_flex().id("pw-credits").size_full().min_h(0).p(18).gap(10).bg(t.popover)
      .child(h_flex().items_center().justify_between()
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Credits"))
        .child(div().id("credits-close").px(8).py(3).rounded(6).text_size(11).cursor_pointer().border_1().border_color(t.border).text_color(t.muted)
          .hover((e) => e.bg(t.hover)).on_click(() => closeOverlay(props().overlay)).child("Close")))
      .child(para("The Pokémon art is from PMD SpriteCollab (github.com/PMDCollab/SpriteCollab). It is not part of this mod: it is downloaded to this computer the first time it is needed."))
      .child(para("Licensed under Creative Commons Attribution-NonCommercial 4.0 (creativecommons.org/licenses/by-nc/4.0) and PMDCollab's non-commercial terms, with credit kept to the artists below. Changes made: each animation is cropped, resized and re-encoded as a GIF. For non-commercial use only."))
      .child(para("Original game sprites belong to Spike Chunsoft. Pokémon and its characters are © Nintendo, Creatures Inc. and GAME FREAK inc. This is an unofficial fan project: not made, endorsed or sponsored by them or by SpriteCollab."))
      .child(div().text_size(12).font_semibold().text_color(t.foreground).mt(6).child("Artists of the sprites in use"))
      .child(div().flex_1().min_h(0).overflow_y_scrollbar().child(
        v_flex().gap(3).children(!r
          ? [div().text_size(11.5).text_color(t.dim).child("Loading…")]
          : r.length === 0 ? [div().text_size(11.5).text_color(t.dim).child("Nothing downloaded yet. Credits appear here once sprites have been fetched.")]
          : r.map((e) => h_flex().gap(8).text_size(11.5)
              .child(div().flex_none().w(230).truncate().text_color(t.foreground).child(e.name))
              .child(div().flex_1().min_w(0).truncate().text_color(t.dim).child(`${e.count} anim${e.count === 1 ? "" : "s"} · ${e.licenses.join(", ")}${e.contact ? " · " + e.contact : ""}`))))));
  }
}
