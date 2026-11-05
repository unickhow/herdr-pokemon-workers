
  /* ================= starters: draw real sprite-sheet frames instead of the procedural animals ================= */
  var STAR = {}; (window.STARTERS || []).forEach(function (e) { STAR[e.id] = e; });
  var SIMG = {};
  function simg(file) {
    var i = SIMG[file];
    if (!i) { i = SIMG[file] = new Image(); i.src = file; }
    return i.complete && i.naturalWidth ? i : null;
  }
  var STATE_ANIMS = {
    working: ["Charge", "Idle"], done: ["Hop", "Pose", "Idle"], blocked: ["Hurt", "Idle"],
    sleep: ["Sleep", "Idle"], idle: ["Idle"], daydream: ["Idle"], walk: ["Walk"]
  };
  var WORK_BIG = {};   // per-species working-anim overrides, e.g. { 157: ["Shoot", "Charge", "Idle"] } (Typhlosion flame; tried, looked like idle)
  function sAnim(sp, big, names) {
    if (big && names === STATE_ANIMS.working && WORK_BIG[SPECIES[sp].big]) names = WORK_BIG[SPECIES[sp].big];
    var e = STAR[SPECIES[sp][big ? "big" : "kid"]]; if (!e) return null;
    for (var i = 0; i < names.length; i++) if (e.anims[names[i]]) return e.anims[names[i]];
    return null;
  }
  function frameIdx(a, off) {
    var d = a.dur && a.dur.length ? a.dur : [8, 8, 8, 8], tot = 0, i;
    for (i = 0; i < d.length; i++) tot += d[i];
    var t = (((NOW + (off || 0)) * 0.06) % tot + tot) % tot;
    for (i = 0; i < d.length; i++) { if (t < d[i]) return Math.min(i, a.cols - 1); t -= d[i]; }
    return 0;
  }
  // Per-anim, per-facing ground line (lowest visible pixel of that facing) and one scale per species,
  // taken from its standing height, so every animal stands on the same line at a comparable size.
  var TARGET = { big: 30, kid: 18 };
  function standH(sp, big) {
    var e = STAR[SPECIES[sp][big ? "big" : "kid"]]; if (!e) return 24;
    var a = e.anims.Idle || e.anims.Walk; return a.rowBox[0].h;
  }
  function scaleOf(sp, big) {
    var h = standH(sp, big), s = TARGET[big ? "big" : "kid"] / h;
    if (s > 0.88 && s < 1.15) return 1;         // close enough: keep native pixels
    var steps = [0.5, 0.6, 2 / 3, 0.75, 0.8, 0.9, 1, 1.25, 1.5];
    var best = 1, d = 9; steps.forEach(function (v) { if (Math.abs(v - s) < d) { d = Math.abs(v - s); best = v; } });
    return best;
  }
  // row = PMD facing (0 down, 1 down-right, 2 right, 3 up-right, 4 up, 5 up-left, 6 left, 7 down-left)
  function spr(ctx, sp, big, names, row, px, py, off, fixed) {
    var a = sAnim(sp, big, names); if (!a) return null;
    var img = simg(a.file); if (!img) return a;
    var fr = fixed != null ? Math.min(fixed, a.cols - 1) : frameIdx(a, off), r = Math.min(row, a.rows - 1), rb = a.rowBox[r];
    var s = scaleOf(sp, big), cx = big ? 16 : 10, ground = py + (big ? 32 : 20);
    var dw = Math.round(a.fw * s), dh = Math.round(a.fh * s);
    var dx = Math.round(px + cx - (rb.x + rb.w / 2) * s), dy = Math.round(ground - (rb.y + rb.h) * s);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, fr * a.fw, r * a.fh, a.fw, a.fh, dx, dy, dw, dh);
    return { h: Math.round(rb.h * s), s: s };
  }
  function headTop(a, py, big) { return py + (big ? 32 : 20) - (a ? a.h : (big ? 30 : 18)); }

  // put an effect's visible glyph (not its origin) a few px above `topY`, centred on x
  function fxAbove(ctx, name, cx, topY, gap, dxExtra) {
    var d = FXD[name]; if (!d) return;
    var feetY = 0, dy = (topY - gap) - feetY + d.py - d.gy1, dx = d.px - (d.gx0 + d.gx1) / 2 + (dxExtra || 0);
    playFx(ctx, name, cx, feetY, dx, dy, name === "alert__all" ? 2400 : 0);
  }
  drawBig = function (ctx, sp, state, px, py, t) {
    shadow(ctx, true, px, py);
    var a = spr(ctx, sp, true, STATE_ANIMS[state] || STATE_ANIMS.idle, 0, px, py, px * 37);
    var ground = py + 32, stand = Math.round(standH(sp, true) * scaleOf(sp, true)), top = ground - stand, cx = px + 16;
    if (state === "sleep") fxAbove(ctx, "sleep__fox", cx, ground - (a ? a.h : 14), 2, 4);
    if (state === "blocked") fxAbove(ctx, "alert__all", cx, top, 1);
    if (state === "working" && !WORK_BIG[SPECIES[sp].big]) sweat(ctx, px + 16 + Math.round(stand * 0.45), top + 2, 0);
  };
  drawBaby = function (ctx, sp, state, px, py, t, j) {
    j = j || 0;
    shadow(ctx, false, px, py);
    var a = spr(ctx, sp, false, STATE_ANIMS[state] || STATE_ANIMS.idle, 0, px, py, px * 37 + j * 211);
    var top = py + 20 - Math.round(standH(sp, false) * scaleOf(sp, false));
    if (state === "sleep" && a) top = py + 20 - a.h;
    if (state === "working") sweat(ctx, px + 16, top + 1, 2500 + j * 900);
    if (state === "sleep") { var z = Math.floor(t / 3) % 4; ctx.globalAlpha = 1 - z / 5; ctx.fillStyle = "#cfd6ff"; ctx.fillRect(px + 15, top - z * 2, 3, 1); ctx.fillRect(px + 16, top + 1 - z * 2, 1, 1); ctx.fillRect(px + 15, top + 2 - z * 2, 3, 1); ctx.globalAlpha = 1; }
    if (state === "blocked") { ctx.fillStyle = "#ff5a64"; ctx.fillRect(px + 9, top - 5, 2, 3); ctx.fillRect(px + 9, top - 1, 2, 1); }
  };
  drawBigLook = function (ctx, sp, px, py, t, look) { drawBig(ctx, sp, "idle", px, py, t); };
  drawRest = function (ctx, sp, big, px, py, t) {
    shadow(ctx, big, px, py); spr(ctx, sp, big, STATE_ANIMS.sleep, 0, px, py, px * 37);
  };
  drawWalker = function (ctx, sp, big, px, py, f, facing) {
    shadow(ctx, big, px, py); spr(ctx, sp, big, STATE_ANIMS.walk, facing < 0 ? 6 : 2, px, py, px * 11);
  };
  drawWalkDir = function (ctx, sp, big, px, py, f, view) {
    shadow(ctx, big, px, py); spr(ctx, sp, big, STATE_ANIMS.walk, view === "up" ? 4 : 0, px, py, px * 11);
  };
  // front -> diagonal -> side, three hand-drawn facings of the walk cycle (no flipping)
  drawTurn = function (ctx, sp, big, px, py, u, toFront, facing, t) {
    var rows = facing < 0 ? [0, 7, 6] : [0, 1, 2], i = Math.min(2, Math.floor(u * 3));
    if (toFront) i = 2 - i;
    shadow(ctx, big, px, py); spr(ctx, sp, big, STATE_ANIMS.walk, rows[i], px, py, 0, 0);
  };
  drawRise = function (ctx, sp, big, px, py, u, up, sleeping, t) {
    var i = Math.min(1, Math.floor(u * 2)); if (!up) i = 1 - i;
    shadow(ctx, big, px, py);
    if (i === 0) spr(ctx, sp, big, STATE_ANIMS.sleep, 0, px, py, 0, 0); else spr(ctx, sp, big, STATE_ANIMS.idle, 0, px, py, 0, 0);
  };
