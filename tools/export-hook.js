
  /* ================= export: bake every scene to a still image and dump the layout data (dev tool, #export) ================= */
  (function () {
    if (!/export/.test(location.hash || "")) return;
    function rle(a) { var out = [], v = a[0], n = 0; for (var i = 0; i < a.length; i++) { if (a[i] === v) n++; else { out.push(v, n); v = a[i]; n = 1; } } out.push(v, n); return out; }
    window.addEventListener("load", function () {
      setTimeout(function () {
        var out = { layouts: {}, scenes: {} }, buckets = [8, 16, 32];
        TOD = Object.assign({}, timeOfDay(12), { h: 4 });   // day colours, but h outside sunrise-sunset so no sun or moon is baked in
        buckets.forEach(function (B) {
          LAY = makeLayout(B); CW = LAY.CW; CH = LAY.CH; bakeGrid(); skyCv = null; lightCv = null;
          var L = LAY, O = L.office;
          out.layouts[B] = { CW: CW, CH: CH, G: G, GW: GW, GH: GH, grid: rle(blockedGrid), desks: L.desks, reception: L.reception, help: L.help, mats: L.mats,
            park: L.park, gate: L.gate, board: L.board, booth: L.booth, bench: L.bench, pond: L.pond, rack: L.rack,
            office: { x: O.x, y: O.y, w: O.w, h: O.h, ft: O.ft, fb: O.fb, doorB: O.doorB, doorR: O.doorR }, lamps: L.lamps };
          SCENES.forEach(function (s) {
            setScene(s.key); baseCv = null;
            var cv = document.createElement("canvas"); cv.width = CW * 2; cv.height = CH * 2;
            var tmp = document.createElement("canvas"); tmp.width = CW; tmp.height = CH; var ctx = tmp.getContext("2d");
            ctx.drawImage(skyFor(TOD), 0, 0); ctx.drawImage(buildBase(), 0, 0);
            var list = [];
            L.desks.forEach(function (d) { list.push({ y: d[1] + 4, f: function () { desk(ctx, d[0], d[1], false, false); } }); });
            L.trees.forEach(function (tr) { list.push({ y: tr[1], f: function () { tree(ctx, tr[0], tr[1], tr[2], tr[3]); } }); });
            L.bamboo.forEach(function (b) { list.push({ y: b[1], f: function () { bamboo(ctx, b[0], b[1]); } }); });
            L.stones.forEach(function (st) { list.push({ y: st[1], f: function () { rock(ctx, st[0], st[1], st[2]); } }); });
            L.plants.forEach(function (p) { list.push({ y: p[1], f: function () { plant(ctx, p[0], p[1]); } }); });
            L.lamps.forEach(function (p) { list.push({ y: p[1], f: function () { lamp(ctx, p[0], p[1]); } }); });
            list.push({ y: L.board[1] + 6, f: function () { board(ctx, L.board[0], L.board[1]); } });
            list.push({ y: L.booth[1] + 4, f: function () { booth(ctx, L.booth[0], L.booth[1] + 4, false, 0); } });
            list.push({ y: L.bench[1] + 2, f: function () { bench(ctx, L.bench[0], L.bench[1]); } });
            list.push({ y: L.rack[1], f: function () { rack(ctx, L.rack[0], L.rack[1], 0); } });
            list.push({ y: O.fb + 6, f: function () { wallSeg(ctx, O.x, O.fb, O.doorB.x0 - O.x); wallSeg(ctx, O.doorB.x1, O.fb, O.x + O.w - O.doorB.x1); } });
            list.sort(function (a, b) { return a.y - b.y; }); list.forEach(function (o) { o.f(); });
            var g2 = cv.getContext("2d"); g2.imageSmoothingEnabled = false; g2.drawImage(tmp, 0, 0, CW * 2, CH * 2);
            out.scenes[s.key + "_" + B] = cv.toDataURL("image/png");
          });
        });
        var pre = document.createElement("pre"); pre.id = "export"; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
        document.title = "EXPORT_DONE";
      }, 800);
    });
  })();
