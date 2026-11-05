
  /* ================= scenes: the same layout and collisions, five different looks ================= */
  var fr0 = fr, treeZ = tree, bambooZ = bamboo, lampZ = lamp;
  var ZEN = { sand: C_SAND, moss: C_MOSS, grav: C_GRAV, water: C_WATER };
  var TH = { key: "zen", rake: true, map: {}, tree: "maple", clump: "bamboo", lamp: "stone", petals: ["#f08a3c", "#ffc9d6", "#d9573a"], flake: false };
  function TM(c) { var m = TH.map[c]; return m || c; }
  fr = function (g, x, y, w, h, col) { g.fillStyle = TM(col); g.fillRect(Math.round(x), Math.round(y), w, h); };
  ellFill = function (g, cx, cy, rx, ry, col) {
    g.fillStyle = TM(col);
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var nx = (x - cx) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny <= 1) g.fillRect(x, y, 1, 1);
    }
  };
  function R4(a) { return a.map(rgb); }

  var SCENES = [
    { key: "zen", name: "禪庭園", sand: ZEN.sand, moss: ZEN.moss, grav: ZEN.grav, water: ZEN.water, rake: true, map: {}, tree: "maple", clump: "bamboo", lamp: "stone", petals: ["#f08a3c", "#ffc9d6", "#d9573a"], flake: false },
    { key: "meadow", name: "草原牧場", sand: R4(["#6fa653", "#7fb85f", "#92c96e", "#a6d97f"]), moss: R4(["#4f8a3e", "#5f9e4a", "#74b45a", "#8ccb6c"]), grav: R4(["#b79a6a", "#c4a874", "#d2b886"]), water: R4(["#2f78b0", "#4a98cc", "#7cbfe4", "#b0e0f4"]),
      rake: false, tree: "leaf", clump: "flowers", lamp: "post", petals: ["#ffffff", "#ffe27a", "#ff9fb5"], flake: false,
      map: { "#4a4a5a": "#8a3a2e", "#565668": "#a64a3a", "#6c6c80": "#c25c48", "#3a3a48": "#5e241c", "#5a5a6a": "#7a3428",
        "#e4d8b2": "#d9b27c", "#6b8a5a": "#a07840", "#d6c99f": "#c89a62", "#f2ecd8": "#f1e3bf", "#f8f4e6": "#f8eed0",
        "#b8402e": "#8a6644", "#d9604a": "#b08a5a", "#8a2e22": "#5a3d2b", "#7f9f78": "#5f9a52",
        "#a8372a": "#2f7a3a", "#d9573a": "#46a04a", "#f08a3c": "#6cc36a", "#ffc070": "#a4e68a", "#e0603e": "#58b455", "#f59a4a": "#84d77c", "#ffd08a": "#b8f0a0" } },
    { key: "greenhouse", name: "溫室花園", sand: R4(["#cfd9cc", "#dce5d8", "#e8efe4", "#f3f8ef"]), moss: R4(["#3f7a4a", "#4f9158", "#62a869", "#7bc47e"]), grav: R4(["#c4c9c4", "#d0d5d0", "#dce0dc"]), water: R4(["#2a7a7a", "#3f9a96", "#6cbcb4", "#a0e0d4"]),
      rake: false, tree: "palm", clump: "ferns", lamp: "stone", petals: ["#ffffff", "#c8f0e4", "#ffe27a"], flake: false,
      map: { "#4a4a5a": "#dfe8e8", "#565668": "#eef4f4", "#6c6c80": "#ffffff", "#3a3a48": "#b8c6c6", "#5a5a6a": "#cdd8d8",
        "#f2ecd8": "#d8f0ee", "#f8f4e6": "#e8f8f6", "#e4d8b2": "#c8b088", "#6b8a5a": "#8a7048", "#d6c99f": "#b89c70",
        "#b8402e": "#e8eeee", "#d9604a": "#ffffff", "#8a2e22": "#b8c6c6", "#7f9f78": "#9cc8b4",
        "#7a7a86": "#8a6a3a", "#8a8a96": "#a8844a", "#9a9aa6": "#c4a05a", "#b0b0bc": "#e0c27a" } },
    { key: "snow", name: "雪景山莊", sand: R4(["#c9d6e6", "#dbe6f2", "#eaf2fa", "#f8fbff"]), moss: R4(["#9db4c8", "#b4c8da", "#cadbea", "#deeaf5"]), grav: R4(["#a8b4c4", "#b8c4d2", "#c8d2de"]), water: R4(["#7fb0cc", "#9cc8e0", "#c0e2f2", "#e4f6fc"]),
      rake: false, tree: "snowpine", clump: "snow", lamp: "stone", petals: ["#ffffff", "#e6f2ff", "#ffffff"], flake: true,
      map: { "#4a4a5a": "#e6eef6", "#565668": "#f4f8fc", "#6c6c80": "#ffffff", "#3a3a48": "#a8b8cc", "#5a5a6a": "#c8d4e2",
        "#b88a5a": "#8a5a3a", "#e4d8b2": "#b4825a", "#6b8a5a": "#6e4528", "#d6c99f": "#a0714a", "#f2ecd8": "#a8744a", "#f8f4e6": "#bd855a",
        "#7f9f78": "#b8cfd8", "#b0b0bc": "#ffffff", "#9a9aa6": "#eef4fa" } },
    { key: "beach", name: "海灘小屋", sand: R4(["#e6cf94", "#efdba4", "#f6e6b8", "#fcf1ce"]), moss: R4(["#5f9a4a", "#74b058", "#8cc66a", "#a6dc84"]), grav: R4(["#b8a078", "#c6ae86", "#d4bc96"]), water: R4(["#1f7ab0", "#3a9acc", "#6cc4e4", "#aee8f4"]),
      rake: false, tree: "palm", clump: "beachgrass", lamp: "tiki", petals: ["#ffffff", "#bfeaf6", "#fff2a0"], flake: false,
      map: { "#4a4a5a": "#a8864a", "#565668": "#bd9a58", "#6c6c80": "#d4b06a", "#3a3a48": "#7a5e30", "#5a5a6a": "#946f3a",
        "#b88a5a": "#c9a468", "#e4d8b2": "#e6c88e", "#6b8a5a": "#9a7a44", "#d6c99f": "#d8b676", "#f2ecd8": "#e8d8a8", "#f8f4e6": "#f0e4bc",
        "#b8402e": "#8a6644", "#d9604a": "#b08a5a", "#8a2e22": "#5a3d2b", "#7f9f78": "#6fc4cf" } }
  ];

  /* --- props that differ in shape, not just colour --- */
  function palm(g, x, y) {
    shade(g, x + 4, y + 1, 9, 3, 0.2);
    var lean = hash(x, y) % 2 ? 1 : -1, i;
    for (i = 0; i < 24; i++) { var tx = x + Math.round(Math.sin(i / 24 * 1.4) * 4 * lean), ty = y - i; fr(g, tx - 1, ty, 3, 1, i % 4 === 0 ? "#6b4a35" : "#8a6644"); fr(g, tx, ty, 1, 1, "#b08a5a"); }
    var hx = x + Math.round(Math.sin(1.4) * 4 * lean), hy = y - 24;
    [[-13, -3], [-10, -9], [-3, -12], [5, -11], [11, -6], [14, -1], [-14, 2], [13, 4]].forEach(function (f, k) {
      for (var u = 0; u <= 1; u += 0.07) { var fx = hx + f[0] * u, fy = hy + f[1] * u + u * u * 6; fr(g, fx, fy, 2, 1, k % 2 ? "#2f7a3a" : "#46a04a"); fr(g, fx, fy - 1, 1, 1, "#6cc36a"); }
    });
    fr(g, hx - 1, hy + 1, 3, 3, "#6b4a35");
  }
  tree = function (g, x, y, r, pine) {
    if (TH.tree === "palm") return palm(g, x, y);
    if (TH.tree === "snowpine") {
      treeZ(g, x, y, r, true);
      ellFill(g, x - 10, y - 24, r * 0.5, 2, "#ffffff"); ellFill(g, x + 9, y - 29, r * 0.5, 2, "#ffffff"); ellFill(g, x, y - 34, r * 0.65, 2, "#ffffff");
      fr(g, x - 6, y - 21, 3, 1, "#eaf2fa"); fr(g, x + 5, y - 26, 3, 1, "#eaf2fa"); return;
    }
    treeZ(g, x, y, r, pine);
  };
  bamboo = function (g, x, y) {
    var k = TH.clump, i;
    if (k === "bamboo") return bambooZ(g, x, y);
    if (k === "flowers") {
      blobF(g, x, y - 9, 10, ["#2f7a3a", "#46a04a", "#6cc36a", "#a4e68a"]);
      for (i = 0; i < 8; i++) fr(g, x - 8 + hash(i, x) % 16, y - 16 + hash(i, y) % 11, 2, 2, ["#ff9fb5", "#ffe27a", "#ffffff", "#b79aff"][i % 4]);
    } else if (k === "ferns") {
      for (i = 0; i < 7; i++) { var a = -1.2 + i * 0.4, len = 16 + hash(i, x) % 8; for (var u = 0; u <= 1; u += 0.07) fr(g, x + Math.sin(a) * len * u, y - Math.cos(a) * len * u * 1.1 + u * u * 5, 2, 1, i % 2 ? "#2f7a3a" : "#4fae5a"); }
      fr(g, x - 3, y - 2, 7, 3, "#5a4a3a");
    } else if (k === "snow") {
      ellFill(g, x, y - 4, 11, 6, "#c9d6e6"); ellFill(g, x - 1, y - 6, 10, 5, "#eaf2fa"); ellFill(g, x - 3, y - 8, 6, 2, "#ffffff");
      fr(g, x - 6, y - 12, 1, 6, "#2b6a44"); fr(g, x + 4, y - 14, 1, 7, "#2b6a44"); fr(g, x - 1, y - 11, 1, 5, "#4a9a5e"); fr(g, x + 7, y - 9, 1, 4, "#2b6a44");
    } else {
      for (i = 0; i < 10; i++) { var bx = x - 9 + i * 2, bh = 12 + hash(i, x) % 12; fr(g, bx, y - bh, 1, bh, "#c8c26a"); fr(g, bx + 1, y - bh + 3, 1, bh - 3, "#9ab04a"); fr(g, bx + (i % 2 ? 1 : -1), y - bh, 1, 2, "#e0d890"); }
    }
  };
  lamp = function (g, x, y) {
    if (TH.lamp === "post") {
      shade(g, x + 2, y + 1, 6, 2, 0.22);
      fr(g, x - 1, y - 22, 3, 23, "#6b4a35"); fr(g, x - 1, y - 22, 1, 23, "#8a6644");
      fr(g, x - 5, y - 28, 11, 7, "#4a3220"); fr(g, x - 4, y - 27, 9, 5, "#ffd98a"); fr(g, x - 6, y - 30, 13, 3, "#4a3220"); fr(g, x - 1, y - 32, 3, 2, "#4a3220");
    } else if (TH.lamp === "tiki") {
      shade(g, x + 2, y + 1, 6, 2, 0.22);
      fr(g, x - 1, y - 26, 3, 27, "#8a6644"); fr(g, x - 1, y - 20, 3, 1, "#5a3d2b"); fr(g, x - 1, y - 12, 3, 1, "#5a3d2b"); fr(g, x - 4, y - 28, 9, 3, "#5a3d2b");
      var fl = ((NOW / 140) | 0) % 2; fr(g, x - 3, y - 33, 7, 6, "#ff9a4a"); fr(g, x - 2, y - 36 - fl, 5, 5, "#ffd23a"); fr(g, x - 1, y - 38 - fl, 3, 2, "#fff2a0");
    } else lampZ(g, x, y);
  };
  drawPetals = function (ctx) {
    var P = TH.petals;
    for (var p = 0; p < 22; p++) {
      var sp2 = TH.flake ? 0.2 + (p % 3) * 0.1 : 0.5 + (p % 4) * 0.25, sway = TH.flake ? 5 : 8, fall = TH.flake ? 55 : 95;
      var px = ((hash(p, 3) % CW) + NOW / 60 * sp2 + Math.sin(NOW / 900 + p) * sway) % CW, py = 54 + (((hash(p, 4) % (CH - 60)) + NOW / fall + Math.sin(NOW / 700 + p) * 6) % (CH - 60));
      ctx.fillStyle = P[p % 3]; ctx.fillRect(Math.round(px), Math.round(py), TH.flake ? (p % 4 ? 1 : 2) : 2, 1); if (!TH.flake && p % 2) ctx.fillRect(Math.round(px) + 1, Math.round(py) - 1, 1, 1);
    }
  };

  /* --- switching --- */
  var sceneSel = null;
  function setScene(key) {
    var s = SCENES.filter(function (k) { return k.key === key; })[0] || SCENES[0];
    TH = s; C_SAND = s.sand; C_MOSS = s.moss; C_GRAV = s.grav; C_WATER = s.water; baseCv = null;
    try { localStorage.setItem("pasture-scene", s.key); } catch (e) {}
    if (sceneSel) sceneSel.value = s.key;
  }
  function nextScene() { var i = SCENES.indexOf(TH); setScene(SCENES[(i + 1) % SCENES.length].key); }
  (function () {
    var bar = document.getElementById("campusZoomOut"); if (!bar) return;
    sceneSel = document.createElement("select"); sceneSel.className = "tbtn"; sceneSel.id = "campusScene"; sceneSel.setAttribute("aria-label", "場景");
    sceneSel.style.cssText = "margin-right:8px;padding-right:4px;cursor:pointer";
    SCENES.forEach(function (s) { var o = document.createElement("option"); o.value = s.key; o.textContent = s.name; sceneSel.appendChild(o); });
    sceneSel.addEventListener("change", function () { setScene(sceneSel.value); sceneSel.blur(); });
    bar.parentNode.insertBefore(sceneSel, bar.parentNode.firstChild);
    document.addEventListener("keydown", function (e) { if (campusIsOpen && (e.key === "s" || e.key === "S") && !e.metaKey && !e.ctrlKey) nextScene(); });
    var start = null, hm = /scene=(\w+)/.exec(location.hash || "");
    if (hm) start = hm[1]; else { try { start = localStorage.getItem("pasture-scene"); } catch (e) {} }
    setScene(start || "zen");
  })();
