/* figures.js — flat-vector figure renderer (Tier-2)
 * A pose is an ARRAY of figures so we can draw 1 (solo) .. N (orgy).
 * Each figure: { c?:colorIndex, head, neck, hip, elbowL, handL, elbowR, handR,
 *                kneeL, footL, kneeR, footR }  — each joint is [x, y].
 * Style: thick rounded "noodle" limbs + chunky torso + gradient + soft shadow.
 * Coordinate space: 120 x 100 viewBox. Ground ~ y = 90.
 */
(function () {
  "use strict";

  // base + light for a soft top-down gradient on each figure
  var PALETTE = [
    { base: "#ff4d8d", light: "#ff8fbb" }, // pink
    { base: "#46d6ff", light: "#92e9ff" }, // cyan
    { base: "#ffce3f", light: "#ffe690" }, // gold
    { base: "#a06bff", light: "#c8a6ff" }, // purple
    { base: "#3fd6a0", light: "#8aecca" }, // green
    { base: "#ff7a45", light: "#ffb08a" }  // orange
  ];

  // ---- helpers ----
  function fx(p, flip) { return (flip ? 120 - p[0] : p[0]); }
  function P(p, flip) { return fx(p, flip).toFixed(1) + "," + p[1].toFixed(1); }

  function limbPath(j, flip) {
    var arms = "M" + P(j.handL, flip) + "L" + P(j.elbowL, flip) + "L" + P(j.neck, flip) +
               "L" + P(j.elbowR, flip) + "L" + P(j.handR, flip);
    var legs = "M" + P(j.footL, flip) + "L" + P(j.kneeL, flip) + "L" + P(j.hip, flip) +
               "L" + P(j.kneeR, flip) + "L" + P(j.footR, flip);
    return arms + " " + legs;
  }
  function spinePath(j, flip) {
    return "M" + P(j.neck, flip) + "L" + P(j.hip, flip);
  }

  var _gid = 0; // globally-unique gradient ids (avoids cross-SVG collisions)
  function figureMarkup(j, idx, flip, scale) {
    var col = PALETTE[(j.c != null ? j.c : idx) % PALETTE.length];
    var gid = "pg" + (_gid++);
    var sp = (scale || 1);
    var torsoW = 11 * sp, limbW = 7 * sp, headR = 7.2 * sp;
    var haloW = 3.6 * sp, halo = "#0b0717";
    var hx = fx(j.head, flip).toFixed(1), hy = j.head[1].toFixed(1);
    var limbD = limbPath(j, flip), spineD = spinePath(j, flip);
    return (
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + col.light + '"/>' +
        '<stop offset="1" stop-color="' + col.base + '"/>' +
      "</linearGradient></defs>" +
      // dark separation outline so overlapping figures stay distinct
      '<g fill="none" stroke="' + halo + '" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="' + limbD + '" stroke-width="' + (limbW + haloW) + '"/>' +
        '<path d="' + spineD + '" stroke-width="' + (torsoW + haloW) + '"/>' +
      "</g>" +
      '<circle cx="' + hx + '" cy="' + hy + '" r="' + (headR + haloW / 2) + '" fill="' + halo + '"/>' +
      // colored body
      '<g class="pf-figure" stroke="url(#' + gid + ')" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="' + limbD + '" stroke-width="' + limbW + '"/>' +
        '<path d="' + spineD + '" stroke-width="' + torsoW + '"/>' +
      "</g>" +
      '<circle cx="' + hx + '" cy="' + hy + '" r="' + headR + '" fill="url(#' + gid + ')"/>'
    );
  }

  // ---- pose templates (array of figures) ----
  // Couples templates reuse the original skeletons; figure 0 = pink, 1 = cyan.
  var POSES = {
    // ---------- SOLO (1 figure) ----------
    soloRecline: [{ head:[30,40], neck:[40,46], hip:[74,56], elbowL:[34,40], handL:[26,36], elbowR:[54,56], handR:[62,64], kneeL:[88,44], footL:[82,30], kneeR:[90,58], footR:[84,46] }],
    soloStand:   [{ head:[60,20], neck:[60,32], hip:[60,56], elbowL:[52,42], handL:[56,60], elbowR:[68,42], handR:[64,60], kneeL:[56,72], footL:[54,88], kneeR:[64,72], footR:[66,88] }],
    soloSit:     [{ head:[60,28], neck:[60,40], hip:[60,62], elbowL:[50,50], handL:[58,66], elbowR:[70,50], handR:[62,66], kneeL:[48,66], footL:[44,80], kneeR:[72,66], footR:[76,80] }],
    soloProne:   [{ head:[24,52], neck:[36,54], hip:[74,56], elbowL:[30,46], handL:[24,42], elbowR:[42,48], handR:[48,46], kneeL:[86,52], footL:[96,50], kneeR:[88,60], footR:[98,60] }],

    // ---------- COUPLES (2 figures) ----------
    missionary: [
      { head:[18,60], neck:[30,60], hip:[64,60], elbowL:[26,52], handL:[20,46], elbowR:[30,70], handR:[24,76], kneeL:[78,46], footL:[70,34], kneeR:[82,58], footR:[74,48] },
      { head:[60,44], neck:[62,50], hip:[80,60], elbowL:[54,58], handL:[52,72], elbowR:[68,58], handR:[70,72], kneeL:[92,66], footL:[100,76], kneeR:[88,70], footR:[96,80] }
    ],
    cowgirl: [
      { head:[20,66], neck:[32,66], hip:[68,66], elbowL:[28,58], handL:[22,52], elbowR:[30,76], handR:[24,82], kneeL:[82,54], footL:[74,42], kneeR:[86,66], footR:[78,54] },
      { head:[66,24], neck:[66,34], hip:[66,56], elbowL:[58,42], handL:[52,50], elbowR:[74,42], handR:[80,50], kneeL:[56,60], footL:[50,68], kneeR:[76,60], footR:[82,68] }
    ],
    reverseCowgirl: [
      { head:[20,66], neck:[32,66], hip:[68,66], elbowL:[28,58], handL:[22,52], elbowR:[30,76], handR:[24,82], kneeL:[82,54], footL:[74,42], kneeR:[86,66], footR:[78,54] },
      { head:[72,26], neck:[70,36], hip:[66,56], elbowL:[64,44], handL:[58,52], elbowR:[78,44], handR:[84,50], kneeL:[60,60], footL:[54,68], kneeR:[78,60], footR:[84,68] }
    ],
    doggy: [
      { head:[24,50], neck:[34,52], hip:[64,52], elbowL:[32,64], handL:[30,76], elbowR:[40,64], handR:[38,76], kneeL:[66,66], footL:[66,78], kneeR:[72,66], footR:[72,78] },
      { head:[86,40], neck:[84,48], hip:[74,60], elbowL:[78,52], handL:[70,54], elbowR:[88,54], handR:[90,62], kneeL:[78,72], footL:[82,80], kneeR:[86,72], footR:[90,80] }
    ],
    spooning: [
      { head:[30,46], neck:[40,50], hip:[70,56], elbowL:[44,44], handL:[52,40], elbowR:[42,58], handR:[50,62], kneeL:[80,46], footL:[74,38], kneeR:[82,60], footR:[88,68] },
      { head:[26,56], neck:[38,60], hip:[68,64], elbowL:[44,56], handL:[52,52], elbowR:[44,68], handR:[52,72], kneeL:[78,56], footL:[72,48], kneeR:[80,70], footR:[88,76] }
    ],
    lotus: [
      { head:[36,30], neck:[46,44], hip:[56,64], elbowL:[40,40], handL:[58,40], elbowR:[52,42], handR:[64,38], kneeL:[48,72], footL:[68,72], kneeR:[60,72], footR:[42,76] },
      { head:[80,30], neck:[70,44], hip:[60,64], elbowL:[64,40], handL:[52,40], elbowR:[76,40], handR:[58,38], kneeL:[56,72], footL:[74,76], kneeR:[68,72], footR:[48,72] }
    ],
    sixtynine: [
      { head:[94,58], neck:[78,58], hip:[42,58], elbowL:[70,53], handL:[63,51], elbowR:[70,63], handR:[63,65], kneeL:[28,53], footL:[14,51], kneeR:[28,63], footR:[14,63] },
      { head:[26,42], neck:[42,42], hip:[78,42], elbowL:[50,37], handL:[57,35], elbowR:[50,47], handR:[57,49], kneeL:[92,37], footL:[106,35], kneeR:[92,47], footR:[106,47] }
    ],
    facesitting: [
      { head:[20,74], neck:[34,74], hip:[72,74], elbowL:[28,68], handL:[22,64], elbowR:[30,80], handR:[24,84], kneeL:[86,64], footL:[80,50], kneeR:[88,78], footR:[82,64] },
      { head:[24,16], neck:[27,30], hip:[31,48], elbowL:[18,38], handL:[13,46], elbowR:[38,38], handR:[44,46], kneeL:[18,56], footL:[15,70], kneeR:[40,56], footR:[46,70] }
    ],
    kneelingOral: [
      { head:[80,22], neck:[80,36], hip:[80,58], elbowL:[72,42], handL:[68,52], elbowR:[88,42], handR:[92,52], kneeL:[76,72], footL:[74,86], kneeR:[84,72], footR:[86,86] },
      { head:[58,48], neck:[52,52], hip:[42,66], elbowL:[56,54], handL:[64,54], elbowR:[48,58], handR:[56,60], kneeL:[40,74], footL:[36,84], kneeR:[46,74], footR:[50,84] }
    ],
    standingWall: [
      { head:[64,22], neck:[64,36], hip:[64,60], elbowL:[56,40], handL:[50,48], elbowR:[72,40], handR:[78,48], kneeL:[60,74], footL:[58,88], kneeR:[70,74], footR:[72,88] },
      { head:[44,30], neck:[50,40], hip:[56,56], elbowL:[54,36], handL:[62,32], elbowR:[48,44], handR:[40,40], kneeL:[72,58], footL:[80,66], kneeR:[70,66], footR:[80,72] }
    ],
    wheelbarrow: [
      { head:[88,28], neck:[86,40], hip:[84,58], elbowL:[78,46], handL:[70,50], elbowR:[80,52], handR:[72,56], kneeL:[82,72], footL:[80,86], kneeR:[90,72], footR:[92,86] },
      { head:[22,60], neck:[32,58], hip:[66,52], elbowL:[30,68], handL:[26,80], elbowR:[36,68], handR:[32,80], kneeL:[72,50], footL:[70,52], kneeR:[70,54], footR:[68,56] }
    ],
    bridge: [
      { head:[30,52], neck:[40,46], hip:[60,40], elbowL:[36,56], handL:[34,72], elbowR:[44,56], handR:[42,72], kneeL:[70,56], footL:[74,72], kneeR:[66,58], footR:[70,74] },
      { head:[78,30], neck:[76,42], hip:[68,56], elbowL:[72,48], handL:[64,46], elbowR:[82,48], handR:[86,54], kneeL:[70,68], footL:[74,78], kneeR:[78,68], footR:[82,78] }
    ],
    piledriver: [
      { head:[34,78], neck:[40,72], hip:[44,40], elbowL:[34,66], handL:[30,72], elbowR:[44,66], handR:[48,72], kneeL:[40,26], footL:[34,16], kneeR:[50,26], footR:[56,16] },
      { head:[60,18], neck:[58,28], hip:[56,44], elbowL:[50,34], handL:[44,42], elbowR:[66,34], handR:[72,42], kneeL:[50,52], footL:[46,66], kneeR:[64,52], footR:[68,66] }
    ],
    butterfly: [
      { head:[20,58], neck:[32,58], hip:[64,52], elbowL:[26,50], handL:[20,44], elbowR:[28,66], handR:[22,72], kneeL:[78,40], footL:[80,26], kneeR:[82,46], footR:[86,32] },
      { head:[92,30], neck:[90,42], hip:[86,58], elbowL:[82,48], handL:[76,52], elbowR:[96,48], handR:[100,54], kneeL:[82,72], footL:[80,86], kneeR:[92,72], footR:[94,86] }
    ],
    standingBent: [
      { head:[20,54], neck:[30,50], hip:[50,46], elbowL:[26,60], handL:[22,74], elbowR:[34,60], handR:[30,74], kneeL:[52,64], footL:[52,86], kneeR:[58,64], footR:[58,86] },
      { head:[82,30], neck:[80,42], hip:[72,56], elbowL:[74,48], handL:[66,50], elbowR:[86,48], handR:[90,54], kneeL:[72,70], footL:[70,86], kneeR:[80,70], footR:[82,86] }
    ],
    pretzel: [
      { head:[24,52], neck:[36,54], hip:[66,56], elbowL:[40,46], handL:[46,42], elbowR:[40,62], handR:[46,66], kneeL:[78,48], footL:[72,40], kneeR:[74,66], footR:[80,76] },
      { head:[76,20], neck:[72,30], hip:[64,48], elbowL:[66,38], handL:[60,44], elbowR:[80,38], handR:[86,44], kneeL:[58,54], footL:[52,62], kneeR:[74,56], footR:[80,64] }
    ],
    eagle: [
      { head:[18,60], neck:[32,60], hip:[62,60], elbowL:[26,54], handL:[20,50], elbowR:[26,66], handR:[20,70], kneeL:[78,46], footL:[88,36], kneeR:[78,74], footR:[88,84] },
      { head:[56,44], neck:[60,50], hip:[80,60], elbowL:[52,56], handL:[50,68], elbowR:[66,56], handR:[68,68], kneeL:[90,64], footL:[98,72], kneeR:[88,70], footR:[96,78] }
    ],
    anvil: [
      { head:[20,64], neck:[32,64], hip:[60,60], elbowL:[26,56], handL:[20,50], elbowR:[28,72], handR:[22,78], kneeL:[58,40], footL:[44,30], kneeR:[64,42], footR:[50,32] },
      { head:[78,34], neck:[76,44], hip:[68,58], elbowL:[72,50], handL:[62,48], elbowR:[82,50], handR:[86,56], kneeL:[70,70], footL:[74,80], kneeR:[78,70], footR:[82,80] }
    ],
    seated: [
      { head:[44,34], neck:[46,48], hip:[48,68], elbowL:[38,56], handL:[34,50], elbowR:[54,56], handR:[60,62], kneeL:[44,74], footL:[40,88], kneeR:[54,74], footR:[58,88] },
      { head:[68,22], neck:[64,36], hip:[58,58], elbowL:[58,30], handL:[48,30], elbowR:[72,32], handR:[78,40], kneeL:[50,62], footL:[44,74], kneeR:[68,62], footR:[76,74] }
    ],

    // ---------- THREESOME (3 figures) ----------
    threeSpit: [
      { head:[40,46], neck:[50,48], hip:[78,50], elbowL:[48,60], handL:[46,72], elbowR:[56,60], handR:[54,72], kneeL:[80,62], footL:[80,74], kneeR:[86,62], footR:[86,74] },
      { c:1, head:[20,38], neck:[24,48], hip:[28,64], elbowL:[20,54], handL:[14,50], elbowR:[30,54], handR:[40,48], kneeL:[24,74], footL:[22,86], kneeR:[32,74], footR:[34,86] },
      { c:2, head:[98,38], neck:[94,48], hip:[86,62], elbowL:[90,54], handL:[82,54], elbowR:[100,54], handR:[104,62], kneeL:[90,74], footL:[94,86], kneeR:[98,74], footR:[102,86] }
    ],
    threeTriangle: [
      { head:[34,40], neck:[38,50], hip:[44,64], elbowL:[32,56], handL:[44,52], elbowR:[42,56], handR:[30,52], kneeL:[40,72], footL:[36,84], kneeR:[48,72], footR:[52,84] },
      { c:1, head:[86,40], neck:[82,50], hip:[76,64], elbowL:[80,56], handL:[68,52], elbowR:[88,56], handR:[90,52], kneeL:[72,72], footL:[68,84], kneeR:[80,72], footR:[84,84] },
      { c:2, head:[60,18], neck:[60,30], hip:[60,52], elbowL:[50,40], handL:[44,48], elbowR:[70,40], handR:[76,48], kneeL:[52,58], footL:[46,70], kneeR:[68,58], footR:[74,70] }
    ],

    // ---------- FOURSOME (4 figures) ----------
    fourSquare: [
      { head:[26,38], neck:[30,48], hip:[34,62], elbowL:[24,54], handL:[18,50], elbowR:[34,54], handR:[40,50], kneeL:[30,72], footL:[28,84], kneeR:[38,72], footR:[40,84] },
      { c:1, head:[54,38], neck:[50,48], hip:[44,62], elbowL:[48,54], handL:[40,52], elbowR:[56,54], handR:[58,50], kneeL:[40,72], footL:[36,84], kneeR:[48,72], footR:[52,84] },
      { c:2, head:[74,38], neck:[78,48], hip:[82,62], elbowL:[72,54], handL:[66,50], elbowR:[82,54], handR:[88,50], kneeL:[78,72], footL:[76,84], kneeR:[86,72], footR:[88,84] },
      { c:3, head:[102,38], neck:[98,48], hip:[92,62], elbowL:[96,54], handL:[88,52], elbowR:[104,54], handR:[106,50], kneeL:[88,72], footL:[84,84], kneeR:[96,72], footR:[100,84] }
    ],

    // ---------- ORGY (6 figures, intentionally loose) ----------
    orgyPile: [
      { c:0, head:[24,44], neck:[30,52], hip:[40,62], elbowL:[24,56], handL:[18,52], elbowR:[34,56], handR:[44,54], kneeL:[38,72], footL:[34,84], kneeR:[46,72], footR:[50,82] },
      { c:1, head:[50,40], neck:[52,50], hip:[56,64], elbowL:[44,54], handL:[38,50], elbowR:[60,54], handR:[66,52], kneeL:[50,74], footL:[46,84], kneeR:[60,74], footR:[64,84] },
      { c:2, head:[78,42], neck:[76,52], hip:[70,64], elbowL:[72,56], handL:[64,52], elbowR:[82,56], handR:[88,54], kneeL:[66,74], footL:[62,84], kneeR:[74,74], footR:[78,84] },
      { c:3, head:[100,44], neck:[96,54], hip:[88,64], elbowL:[92,58], handL:[84,56], elbowR:[102,58], handR:[106,56], kneeL:[84,74], footL:[80,84], kneeR:[92,74], footR:[96,84] },
      { c:4, head:[38,30], neck:[42,40], hip:[48,52], elbowL:[34,44], handL:[28,42], elbowR:[50,44], handR:[56,44], kneeL:[44,60], footL:[40,70], kneeR:[52,60], footR:[56,70] },
      { c:5, head:[68,30], neck:[64,40], hip:[58,52], elbowL:[60,44], handL:[54,42], elbowR:[72,44], handR:[78,44], kneeL:[56,60], footL:[52,70], kneeR:[64,60], footR:[68,70] }
    ],
    orgyRing: [
      { c:0, head:[40,26], neck:[44,36], hip:[50,48], elbowL:[38,40], handL:[48,44], elbowR:[46,40], handR:[36,36], kneeL:[46,54], footL:[40,62], kneeR:[54,54], footR:[58,60] },
      { c:1, head:[80,26], neck:[76,36], hip:[70,48], elbowL:[72,40], handL:[62,44], elbowR:[82,40], handR:[84,36], kneeL:[66,54], footL:[62,60], kneeR:[74,54], footR:[80,62] },
      { c:2, head:[100,52], neck:[90,52], hip:[78,54], elbowL:[86,46], handL:[78,46], elbowR:[88,58], handR:[80,60], kneeL:[74,60], footL:[66,58], kneeR:[76,64], footR:[68,66] },
      { c:3, head:[80,80], neck:[76,70], hip:[70,60], elbowL:[72,66], handL:[62,62], elbowR:[82,66], handR:[86,70], kneeL:[66,56], footL:[60,50], kneeR:[74,56], footR:[80,50] },
      { c:4, head:[40,80], neck:[44,70], hip:[50,60], elbowL:[38,66], handL:[48,62], elbowR:[46,66], handR:[36,70], kneeL:[46,56], footL:[40,50], kneeR:[54,56], footR:[60,50] },
      { c:5, head:[20,52], neck:[30,52], hip:[42,54], elbowL:[26,46], handL:[34,46], elbowR:[28,58], handR:[36,60], kneeL:[46,60], footL:[54,58], kneeR:[44,64], footR:[52,66] }
    ]
  };

  /**
   * render(name, opts) -> svg string
   * opts: { flip, neon, ground }
   */
  function render(name, opts) {
    opts = opts || {};
    var figs = POSES[name] || POSES.missionary;
    var flip = !!opts.flip;
    var scale = figs.length >= 5 ? 0.7 : (figs.length === 4 ? 0.85 : 1);
    var cls = "pf-svg" + (opts.neon ? " neon" : "");
    var ground = opts.ground
      ? '<ellipse cx="60" cy="92" rx="48" ry="4.5" fill="rgba(0,0,0,0.28)"/>'
      : "";
    var body = "";
    for (var i = 0; i < figs.length; i++) body += figureMarkup(figs[i], i, flip, scale);
    return (
      '<svg class="' + cls + '" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        ground + body +
      "</svg>"
    );
  }

  function figureCount(name) { return (POSES[name] || []).length; }
  function colorAt(i) { return PALETTE[i % PALETTE.length].base; }

  window.Figures = { render: render, POSES: POSES, PALETTE: PALETTE, figureCount: figureCount, colorAt: colorAt };
})();
