// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: hourglass-half;
// ============================================================
//  LIFE & TIME (pink)  -  a Scriptable widget + tap-to-open dashboard
//  ----------------------------------------------------------
//  HOW TO USE
//    1. Scriptable -> + (new script) -> paste ALL of this -> name it "Life & Time".
//       (This is the pink build. The kitty artwork is embedded at the bottom.)
//    2. Long-press home screen -> + -> Scriptable -> add a Small / Medium / Large widget.
//    3. Long-press the widget -> Edit Widget -> Script: "Life & Time".
//       (Small widget only) Parameter:  year | life | countdown  picks the hero.
//    4. Tap the widget any time to open the full dashboard.
//
//  The MEDIUM widget is now STACKED: year on top, life underneath, each using
//  the full width. Everything is laid out in real widget views (crisp text) and
//  the dot grid is drawn at exact device pixel scale (no downscaling blur).
//
//  Only the CONFIG block below needs editing.
//  NOTE: this file is deliberately pure ASCII - special characters are written
//  as \u escapes so copy/pasting can never mangle them.
// ============================================================

// ---------------- CONFIG (edit me) ----------------
const CONFIG = {
  birth: { y: 2009, m: 2, d: 4 },    // her birthday - month is 1-12
  targetAge: 85,                     // "assume I live to ___"
  place: "Perth",                    // shown on the dashboard
  weekStart: 1,                      // 1 = week starts Monday, 0 = Sunday
  dotUnit: "auto",                   // "auto" | "weeks" | "months" | "years"
                                     //   auto = finest unit that still renders crisply
  theme: "dark",                     // "dark"  = pink on near-black. Use this if you
                                     //           turn on the iOS tinted/glass home
                                     //           screen - see the note below.
                                     // "blush" = light pink. Prettier on a plain home
                                     //           screen, but washes out under tint.

  // Markers along the year bar. Emoji are written as \u escapes so the file
  // stays pure ASCII and cannot be mangled by copy/paste.
  markers: true,
  events: [                          // the big ones, drawn as emoji
    { m: 1,  d: 1,  emoji: "\uD83C\uDF89", label: "New Year" },
    { m: 2,  d: 4,  emoji: "\uD83C\uDF82", label: "Birthday" },
    { m: 2,  d: 14, emoji: "\uD83D\uDC98", label: "Valentine's Day" },
    { easter: true, emoji: "\uD83D\uDC23", label: "Easter" },
    { m: 4,  d: 25, emoji: "\uD83C\uDF6A", label: "Anzac Day" },
    { m: 7,  d: 13, avatar: true,           label: "Anniversary" },
    { m: 10, d: 31, emoji: "\uD83C\uDF83", label: "Halloween" },
    { m: 12, d: 25, emoji: "\uD83C\uDF84", label: "Christmas" },
  ],
  holidays: true,                    // WA public holidays, as small ticks
};
// --------------------------------------------------

const MID  = "\u00B7";  // middle dot
const APX  = "\u2248";  // almost-equal
const DASH = "\u2014";  // em dash

// Palette
//
// WHY THERE ARE TWO. The iOS tinted ("glass") home screen does not just recolour
// a widget - it maps the widget's BRIGHTNESS onto the tint: bright pixels become
// the tint colour, dark pixels drop away to clear glass. A light-on-light widget
// therefore collapses into one solid bright block with the text invisible, which
// is exactly what the blush theme does under tint. The dark theme keeps a dark
// background and bright content, so tinting reads it correctly.
const THEMES = {
  dark: {
    bgTop:    "#2A121C",  bgMid:    "#170A11",  bgBot:    "#0B0508",
    panel:    "#1C0D14",  hairline: "#3E2430",  track:    "#3A2029",
    dotEmpty: "#4E2E3C",  accent:   "#FF4FA3",  accentDeep: "#B81C64",
    textHi:   "#FFFFFF",  textMid:  "#F2D8E5",  label:    "#C08FAB",
    ember:    "#FFD166",  amber:    "#FFD60A",
  },
  blush: {
    bgTop:    "#FFF7FB",  bgMid:    "#FFE9F4",  bgBot:    "#FFD4E8",
    panel:    "#FFF1F7",  hairline: "#FFB9D6",  track:    "#FFCBE1",
    dotEmpty: "#FFAFD1",  accent:   "#FF2E86",  accentDeep: "#FF7EB6",
    textHi:   "#3D0F28",  textMid:  "#7A2B52",  label:    "#B0678F",
    ember:    "#8B2FC9",  amber:    "#F59E0B",
  },
};
const C = THEMES[CONFIG.theme] || THEMES.dark;

// ---------------- date math ----------------
const DAY  = 86400000;
const WEEK = 604800000;
const YEARMS = 365.2425 * DAY;

const birth = new Date(CONFIG.birth.y, CONFIG.birth.m - 1, CONFIG.birth.d);
const death = new Date(birth.getTime());
death.setFullYear(birth.getFullYear() + CONFIG.targetAge);
const now = new Date();

const clamp01 = x => Math.max(0, Math.min(1, x));
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(",");
const frac = (a, t, b) => clamp01((t - a) / (b - a));
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const nf = n => Math.round(n).toLocaleString("en-US");
const d1 = n => (Math.round(n * 10) / 10).toFixed(1);

// year
const yStart = new Date(now.getFullYear(), 0, 1);
const yEnd   = new Date(now.getFullYear() + 1, 0, 1);
const yearFrac = frac(yStart, now, yEnd);
const daysLeftYear = Math.ceil((yEnd - now) / DAY);
const dayOfYear = Math.floor((startOfDay(now) - yStart) / DAY) + 1;
const weekOfYear = Math.ceil(dayOfYear / 7);

// month
const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
const mEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
const monthFrac = frac(mStart, now, mEnd);
const daysLeftMonth = Math.ceil((mEnd - now) / DAY);

// week (anchored to CONFIG.weekStart)
const dow = (now.getDay() - CONFIG.weekStart + 7) % 7;
const wStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
const wEnd   = new Date(wStart.getTime() + WEEK);
const weekFrac = frac(wStart, now, wEnd);
const daysLeftWeek = Math.ceil((wEnd - now) / DAY);

// day
const dStart = startOfDay(now);
const dayFrac = frac(dStart, now, new Date(dStart.getTime() + DAY));
const msLeftDay = DAY - (now - dStart);
const hLeft = Math.floor(msLeftDay / 3600000);
const mLeft = Math.floor((msLeftDay % 3600000) / 60000);

// life
const lifeFrac     = frac(birth, now, death);
const ageNow       = (now - birth) / YEARMS;
const yearsLeft    = Math.max(0, (death - now) / YEARMS);
const daysLeftLife = Math.max(0, Math.round((death - now) / DAY));
const daysLived    = Math.floor((now - birth) / DAY);
const totalWeeks   = Math.round((death - birth) / WEEK);
const weeksLived   = Math.max(0, Math.floor((now - birth) / WEEK));
const weeksLeft    = Math.max(0, totalWeeks - weeksLived);
const sundaysLeft  = Math.max(0, Math.floor((death - now) / WEEK));
const summersLeft  = Math.max(0, Math.floor(yearsLeft));

// ---------------- year markers ----------------
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a, b) => a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Anonymous Gregorian computus - Easter moves, so it has to be calculated
// rather than listed, or the widget goes wrong next year.
function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31);
  return new Date(y, mo - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
// n = 1 for the first such weekday of the month, -1 for the last
function nthWeekday(y, month, weekday, n) {
  if (n > 0) {
    const first = new Date(y, month - 1, 1);
    return new Date(y, month - 1, 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7);
  }
  const last = new Date(y, month, 0);
  return new Date(y, month - 1, last.getDate() - ((last.getDay() - weekday + 7) % 7));
}
// Western Australia. Weekend holidays get a substitute weekday, which is why
// Christmas can spill into a third and fourth day some years.
function holidaysFor(y) {
  const easter = easterSunday(y);
  // sub = does a weekend date earn a substitute weekday. The Easter three are
  // already defined relative to a Sunday, so they never generate one.
  const list = [
    { d: new Date(y, 0, 1),        sub: true  },  // New Year's Day
    { d: new Date(y, 0, 26),       sub: true  },  // Australia Day
    { d: nthWeekday(y, 3, 1, 1),   sub: false },  // Labour Day - 1st Mon in March
    { d: addDays(easter, -2),      sub: false },  // Good Friday
    { d: easter,                   sub: false },  // Easter Sunday
    { d: addDays(easter, 1),       sub: false },  // Easter Monday
    { d: new Date(y, 3, 25),       sub: true  },  // Anzac Day
    { d: nthWeekday(y, 6, 1, 1),   sub: false },  // WA Day - 1st Mon in June
    { d: nthWeekday(y, 9, 1, -1),  sub: false },  // King's Birthday - last Mon Sept
    { d: new Date(y, 11, 25),      sub: true  },  // Christmas Day
    { d: new Date(y, 11, 26),      sub: true  },  // Boxing Day
  ];
  const out = list.map(x => x.d);
  for (const x of list) {
    const wd = x.d.getDay();
    if (!x.sub || (wd !== 0 && wd !== 6)) continue;
    let s = addDays(x.d, wd === 6 ? 2 : 1);
    while (out.some(o => sameDay(o, s))) s = addDays(s, 1);
    out.push(s);
  }
  return out;
}
function yearFracOf(d) {
  const a = new Date(d.getFullYear(), 0, 1), b = new Date(d.getFullYear() + 1, 0, 1);
  return clamp01((startOfDay(d) - a) / (b - a));
}
function yearMarkers() {
  const y = now.getFullYear();
  const majors = (CONFIG.events || []).map(ev => ({
    emoji: ev.emoji,
    avatar: ev.avatar,
    label: ev.label,
    f: yearFracOf(ev.easter ? easterSunday(y) : new Date(y, ev.m - 1, ev.d)),
  })).sort((a, b) => a.f - b.f);
  const minors = CONFIG.holidays
    ? holidaysFor(y).map(d => ({ f: yearFracOf(d) })).sort((a, b) => a.f - b.f)
    : [];
  return { majors, minors };
}

// grid units: total cells + how many are already spent
const UNITS = {
  weeks:  { total: totalWeeks,             lived: weeksLived },
  months: { total: CONFIG.targetAge * 12,  lived: Math.floor(ageNow * 12) },
  years:  { total: CONFIG.targetAge,       lived: Math.floor(ageNow) },
};

// ---------------- countdown persistence ----------------
function store() {
  const fm = FileManager.local();
  return { fm, path: fm.joinPath(fm.documentsDirectory(), "lifetime.json") };
}
function loadData() {
  const { fm, path } = store();
  if (fm.fileExists(path)) {
    try { return JSON.parse(fm.readString(path)); } catch (e) { /* fall through */ }
  }
  return { countdowns: [] };
}
function saveData(d) {
  const { fm, path } = store();
  fm.writeString(path, JSON.stringify(d));
}

function computeCountdowns(list) {
  return (list || []).map(c => {
    const target = new Date(c.date + "T00:00:00");
    const from = c.from ? new Date(c.from + "T00:00:00") : yStart;
    const total = Math.max(1, target - from);
    const elapsed = clamp01((now - from) / total);
    const daysLeft = Math.ceil((target - now) / DAY);
    return {
      title: c.title,
      date: c.date,
      daysLeft,
      pct: elapsed * 100,
      urgent: daysLeft >= 0 && daysLeft <= 2,
      past: daysLeft < 0,
    };
  }).sort((a, b) => a.daysLeft - b.daysLeft);
}
function nearestCountdown(cds) {
  const up = cds.filter(c => !c.past);
  return up.length ? up[0] : null;
}

// ---------------- reflective lines (deterministic by day-of-year) ----------------
const REFLECTIONS = [
  "You have lived roughly " + nf(daysLived) + " days.",
  "About " + nf(summersLeft) + " summers remain.",
  "Roughly " + nf(sundaysLeft) + " Sundays left " + DASH + " spend them well.",
  nf(weeksLeft) + " weeks remain on the wall.",
  "You are " + d1(lifeFrac * 100) + "% of the way through.",
  "Today is one of " + nf(daysLeftLife) + " days you have left.",
];
const reflection = REFLECTIONS[dayOfYear % REFLECTIONS.length];

// ============================================================
//  WIDGET
//  Text = native widget views (crisp at any scale).
//  Dot grid = DrawContext sized in POINTS with respectScreenScale,
//             so it renders 1:1 with device pixels instead of being
//             squashed down from an oversized bitmap.
// ============================================================

// Widget point sizes per device. Falls back to a ratio if unknown.
const SIZES = {
  "440x956": { small: [170, 170], medium: [364, 170], large: [364, 382] },
  "430x932": { small: [170, 170], medium: [364, 170], large: [364, 382] },
  "428x926": { small: [170, 170], medium: [364, 170], large: [364, 382] },
  "414x896": { small: [169, 169], medium: [360, 169], large: [360, 379] },
  "402x874": { small: [162, 162], medium: [344, 162], large: [344, 366] },
  "393x852": { small: [158, 158], medium: [338, 158], large: [338, 354] },
  "390x844": { small: [158, 158], medium: [338, 158], large: [338, 354] },
  "375x812": { small: [155, 155], medium: [329, 155], large: [329, 345] },
  "414x736": { small: [159, 159], medium: [348, 159], large: [348, 357] },
  "375x667": { small: [148, 148], medium: [321, 148], large: [321, 324] },
  "360x780": { small: [155, 155], medium: [329, 155], large: [329, 345] },
  "320x568": { small: [141, 141], medium: [291, 141], large: [291, 299] },
};
function widgetBox(family) {
  const s = Device.screenSize();
  const sw = Math.round(Math.min(s.width, s.height));
  const sh = Math.round(Math.max(s.width, s.height));
  const e = SIZES[sw + "x" + sh];
  if (e && e[family]) return { w: e[family][0], h: e[family][1] };
  const sm = Math.round(sw * 0.40);
  if (family === "medium") return { w: Math.round(sw * 0.86), h: sm };
  if (family === "large")  return { w: Math.round(sw * 0.86), h: Math.round(sw * 0.90) };
  return { w: sm, h: sm };
}

// ---- small view helpers ----
function txt(parent, s, font, hex, opts) {
  const o = opts || {};
  const t = parent.addText(s);
  t.font = font;
  t.textColor = new Color(hex);
  t.lineLimit = 1;
  t.minimumScaleFactor = o.min != null ? o.min : 0.6;
  if (o.right) t.rightAlignText();
  return t;
}
function kicker(parent, s, right, size) {
  return txt(parent, s.toUpperCase(), Font.semiboldSystemFont(size || 11), C.label, { right });
}
function hairline(parent, w) {
  const d = parent.addStack();
  d.size = new Size(w, 1);
  d.backgroundColor = new Color(C.hairline);
  return d;
}
// header line: label on the left, stat on the right
function headerRow(parent, w, left, right, size) {
  const s = parent.addStack();
  s.layoutHorizontally();
  s.centerAlignContent();
  s.size = new Size(w, 0);
  kicker(s, left, false, size);
  s.addSpacer();
  if (right) kicker(s, right, true, size);
  return s;
}
// native rounded progress bar (real gradient, perfectly crisp)
function bar(parent, w, h, fr, c1, c2) {
  const track = parent.addStack();
  track.layoutHorizontally();
  track.size = new Size(w, h);
  track.cornerRadius = h / 2;
  track.backgroundColor = new Color(C.track);
  const fill = track.addStack();
  fill.size = new Size(Math.max(h, Math.round(w * clamp01(fr))), h);
  fill.cornerRadius = h / 2;
  const g = new LinearGradient();
  g.colors = [new Color(c1 || C.accentDeep), new Color(c2 || C.accent)];
  g.locations = [0, 1];
  g.startPoint = new Point(0, 0);
  g.endPoint = new Point(1, 0);
  fill.backgroundGradient = g;
  track.addSpacer();
  return track;
}

// ---- dot grid ----
function rrect(dc, x, y, w, h, r, hex, alpha) {
  const p = new Path();
  p.addRoundedRect(new Rect(x, y, w, h), r, r);
  dc.setFillColor(alpha != null ? new Color(hex, alpha) : new Color(hex));
  dc.addPath(p);
  dc.fillPath();
}
// Dot grids are snapped to WHOLE DEVICE PIXELS. At the sizes a widget allows,
// a fractional pitch makes some dots 4px and their neighbours 5px, which reads
// as noise - that is a big part of why the old grid looked like static. Here the
// pitch is an integer pixel count, so every dot is identical: (p-1)px of ink and
// a 1px gutter.
function fitGridPx(total, boxW, boxH, S) {
  const wpx = Math.floor(boxW * S), hpx = Math.floor(boxH * S);
  for (let p = 30; p >= 3; p--) {
    const maxCols = Math.floor(wpx / p), maxRows = Math.floor(hpx / p);
    if (maxCols < 1 || maxRows < 1 || maxCols * maxRows < total) continue;
    // Several column counts fit at this pitch. Pick the one that leaves the
    // fewest blank slots in the last row, so the block reads as a rectangle
    // instead of trailing off in a ragged step.
    // ...but never give up more than 5% of the width to do it, or the grid
    // stops filling its box (1020 months divides evenly by 51 columns, which
    // would leave a fifth of the small widget empty).
    let cols = maxCols, waste = Infinity;
    const minCols = Math.ceil(maxCols * 0.95);
    for (let c = Math.max(minCols, Math.ceil(total / maxRows)); c <= maxCols; c++) {
      const rows = Math.ceil(total / c);
      if (rows > maxRows) continue;
      const blanks = rows * c - total;
      if (blanks < waste) { waste = blanks; cols = c; }
    }
    return { p, cols, rows: Math.ceil(total / cols) };
  }
  return null;
}
// Below 4px of pitch a dot is 3px of ink and stops reading as a dot, so "auto"
// steps up to a coarser unit rather than draw mush. An explicit CONFIG.dotUnit
// is honoured as long as it fits at all.
const MIN_DOT_PX = 4;
function chooseGrid(boxW, boxH, S) {
  if (CONFIG.dotUnit !== "auto" && UNITS[CONFIG.dotUnit]) {
    const u = UNITS[CONFIG.dotUnit];
    const f = fitGridPx(u.total, boxW, boxH, S);
    if (f) return Object.assign({ unit: u, name: CONFIG.dotUnit }, f);
  }
  let last = null;
  for (const name of ["weeks", "months", "years"]) {
    const u = UNITS[name];
    const f = fitGridPx(u.total, boxW, boxH, S);
    if (!f) continue;
    last = Object.assign({ unit: u, name }, f);
    if (f.p >= MIN_DOT_PX) return last;
  }
  return last;
}
function gridImage(boxW, boxH) {
  const S = Device.screenScale();
  const g = chooseGrid(boxW, boxH, S);
  if (!g) return null;
  const gw = (g.cols * g.p) / S, gh = (g.rows * g.p) / S;
  const dc = new DrawContext();
  dc.size = new Size(gw, gh);
  dc.opaque = false;
  dc.respectScreenScale = true;              // -> exact device pixels, no blur
  const cellPx = Math.max(2, g.p - 1);
  const cell = cellPx / S;
  const r = cellPx <= 4 ? 0 : cell * 0.3;    // squares stay legible when tiny
  for (let i = 0; i < g.unit.total; i++) {
    const x = ((i % g.cols) * g.p) / S;
    const y = (Math.floor(i / g.cols) * g.p) / S;
    if (i < g.unit.lived)       rrect(dc, x, y, cell, cell, r, C.accent);
    else if (i === g.unit.lived) rrect(dc, x, y, cell, cell, r, C.ember);
    else                        rrect(dc, x, y, cell, cell, r, C.dotEmpty, 0.85);
  }
  return { image: dc.getImage(), w: gw, h: gh, unit: g.name, p: g.p };
}
function addGrid(parent, boxW, boxH) {
  const g = gridImage(boxW, boxH);
  if (!g) return null;
  const wi = parent.addImage(g.image);
  wi.imageSize = new Size(g.w, g.h);
  wi.resizable = false;
  return g;
}

// ---- Hello Kitty ----
// The artwork below is the source PNG, background removed and cropped at the
// shirt hem so only head, arms and upper torso remain. It is embedded rather
// than redrawn, so it is the original art pixel for pixel.
let _kitty = null;
function kittyImage() {
  if (!_kitty) _kitty = Image.fromData(Data.fromBase64String(KITTY_B64));
  return _kitty;
}
function drawKitty(dc, x, y, w) {
  const img = kittyImage();
  const h = w * (img.size.height / img.size.width);
  dc.drawImageInRect(img, new Rect(x, y, w, h));
}

// ---- backgrounds ----
// Painted rather than set as backgroundGradient, because the kitty has to sit
// on top of the gradient in the same layer (a widget takes one background).
function hexMix(a, b, t) {
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
}
function backdrop(w, box, kitty) {
  const dc = new DrawContext();
  dc.size = new Size(box.w, box.h);
  dc.opaque = false;
  dc.respectScreenScale = true;
  const N = 96;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const hex = t < 0.5 ? hexMix(C.bgTop, C.bgMid, t / 0.5) : hexMix(C.bgMid, C.bgBot, (t - 0.5) / 0.5);
    dc.setFillColor(new Color(hex));
    dc.fillRect(new Rect(0, box.h * i / N, box.w, box.h / N + 1));
  }
  if (kitty) drawKitty(dc, kitty.x, kitty.y, kitty.w);
  w.backgroundImage = dc.getImage();
}

// ---- year-bar markers ----
let _avatar = null;
function avatarImage() {
  if (!_avatar) _avatar = Image.fromData(Data.fromBase64String(AVATAR_B64));
  return _avatar;
}
// Minor ticks are drawn (exact positions), the big ones are native emoji text
// (so they render in colour and stay crisp). An emoji sits in a fixed-width
// cell, which keeps positioning deterministic instead of accumulating error.
function tickImage(w, h, majors, minors) {
  const dc = new DrawContext();
  dc.size = new Size(w, h);
  dc.opaque = false;
  dc.respectScreenScale = true;
  const TW = 1.5, MINGAP = 3, HIDE = 7;
  const placed = [];
  for (const m of minors) {
    const x = m.f * w;
    if (majors.some(M => Math.abs(M.f * w - x) < HIDE)) continue;   // sits under an emoji
    if (placed.some(px => Math.abs(px - x) < MINGAP)) continue;     // too close to call apart
    placed.push(x);
  }
  for (const x of placed) {
    rrect(dc, Math.max(0, Math.min(w - TW, x - TW / 2)), h * 0.35, TW, h * 0.65,
          TW / 2, C.label, 0.9);
  }
  for (const M of majors) {
    rrect(dc, Math.max(0, Math.min(w - TW, M.f * w - TW / 2)), 0, TW, h,
          TW / 2, C.textHi, 0.95);
  }
  return dc.getImage();
}
function emojiRow(parent, w, majors, size, h) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.size = new Size(w, h);
  const EW = Math.round(size * 1.35);
  // Two-pass de-overlap. A forward pass alone pushes each emoji right and the
  // last one falls off the end - which silently dropped Christmas. The backward
  // pass pulls the tail back inside, so every marker survives.
  const xs = majors.map(m => Math.max(0, Math.min(w - EW, m.f * w - EW / 2)));
  for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i], xs[i - 1] + EW);
  for (let i = xs.length - 1; i >= 0; i--) {
    if (xs[i] > w - EW) xs[i] = w - EW;
    if (i > 0 && xs[i - 1] > xs[i] - EW) xs[i - 1] = Math.max(0, xs[i] - EW);
  }
  let cursor = 0;
  for (let i = 0; i < majors.length; i++) {
    const m = majors[i];
    const start = xs[i];
    if (start + EW > w + 0.5) continue;      // genuinely no room (too many markers)
    if (start > cursor) row.addSpacer(start - cursor);
    const cell = row.addStack();
    cell.layoutHorizontally();
    cell.centerAlignContent();
    cell.size = new Size(EW, h);
    if (m.avatar) {
      const wi = cell.addImage(avatarImage());
      wi.imageSize = new Size(size, size);
      wi.resizable = true;
    } else {
      const t = cell.addText(m.emoji);
      t.font = Font.systemFont(size);
      t.lineLimit = 1;
    }
    cursor = start + EW;
  }
  row.addSpacer();
}
function markerStrip(parent, w, tickH, size, emojiH) {
  const M = yearMarkers();
  const img = tickImage(w, tickH, M.majors, M.minors);
  const wi = parent.addImage(img);
  wi.imageSize = new Size(w, tickH);
  wi.resizable = false;
  emojiRow(parent, w, M.majors, size, emojiH);
}

// ============================================================
//  MEDIUM  -  stacked: year on top, life underneath, full width each
// ============================================================
function buildMedium(w) {
  const box = widgetBox("medium");
  const PAD = 10;
  const innerW = box.w - PAD * 2;
  const innerH = box.h - PAD * 2;
  w.setPadding(PAD, PAD, PAD, PAD);

  // NOTE: never give a text container a fixed height. A 22pt font has a ~28pt
  // line box, so a Size(w, 22) stack makes the glyphs spill into the row above.
  // Width-only sizing (height 0 = auto) is what keeps rows from colliding.
  const NUM = 22, LINE = Math.ceil(NUM * 1.25);
  const BARH = 10, GAP = 7, LEAD = 4;
  const TICKH = 4, EMOJI = 11, EMOJIH = 14;
  const STRIP = CONFIG.markers ? TICKH + EMOJIH : 0;

  // ---------- YEAR:  61%  2026 ................ 141 days left ----------
  // The kitty occupies the top-right, so the year block runs to a shorter
  // width and both its labels sit on the left.
  const KW = 46, yearW = innerW - KW;
  const r1 = w.addStack();
  r1.layoutHorizontally();
  r1.centerAlignContent();
  r1.size = new Size(yearW, 0);
  txt(r1, Math.round(yearFrac * 100) + "%", Font.boldSystemFont(NUM), C.textHi);
  r1.addSpacer(8);
  kicker(r1, String(now.getFullYear()) + " " + MID + " " + nf(daysLeftYear) + " days left");
  r1.addSpacer();
  w.addSpacer(LEAD);
  bar(w, yearW, BARH, yearFrac);
  if (CONFIG.markers) markerStrip(w, yearW, TICKH, EMOJI, EMOJIH);

  w.addSpacer(GAP);
  hairline(w, innerW);
  w.addSpacer(GAP);

  // ---------- LIFE:  22.0%  life . age 18 ..... 3,460 weeks left ----------
  const r2 = w.addStack();
  r2.layoutHorizontally();
  r2.centerAlignContent();
  r2.size = new Size(innerW, 0);
  txt(r2, d1(lifeFrac * 100) + "%", Font.boldSystemFont(NUM), C.textHi);
  r2.addSpacer(8);
  kicker(r2, "Life " + MID + " age " + Math.floor(ageNow));
  r2.addSpacer();
  kicker(r2, nf(weeksLeft) + " weeks left", true);
  w.addSpacer(LEAD);

  // Everything left over goes to the grid, at the full width of the widget.
  const gridH = innerH - (LINE + LEAD + BARH + STRIP + GAP + 1 + GAP + LINE + LEAD);
  const gb = w.addStack();
  gb.layoutHorizontally();
  gb.size = new Size(innerW, gridH);
  addGrid(gb, innerW, gridH);
  gb.addSpacer();
}

// ============================================================
//  LARGE  -  same stack, room to breathe
// ============================================================
function buildLarge(w) {
  const box = widgetBox("large");
  const PAD = 16;
  const innerW = box.w - PAD * 2;
  const innerH = box.h - PAD * 2;
  w.setPadding(PAD, PAD, PAD, PAD);

  const NUM = 40, LINE = Math.ceil(NUM * 1.25);
  const BARH = 13, GAP = 10, LEAD = 6, TILES = 42, CAP = 14;
  const TICKH = 5, EMOJI = 13, EMOJIH = 16;
  const STRIP = CONFIG.markers ? TICKH + EMOJIH : 0;

  // ---------- YEAR ----------
  const KW = 58;
  headerRow(w, innerW - KW, String(now.getFullYear()) + " " + MID + " week " + weekOfYear
                            + " of 52 " + MID + " " + nf(daysLeftYear) + " days left", null, 12);
  w.addSpacer(3);
  txt(w, Math.round(yearFrac * 100) + "%", Font.boldSystemFont(NUM), C.textHi, { min: 0.5 });
  w.addSpacer(LEAD);
  bar(w, innerW, BARH, yearFrac);
  if (CONFIG.markers) markerStrip(w, innerW, TICKH, EMOJI, EMOJIH);

  w.addSpacer(GAP);
  const tiles = w.addStack();
  tiles.layoutHorizontally();
  tiles.size = new Size(innerW, 0);
  miniStat(tiles, "today", d1(dayFrac * 100) + "%", hLeft + "h " + mLeft + "m left");
  tiles.addSpacer();
  miniStat(tiles, "week", d1(weekFrac * 100) + "%", daysLeftWeek + "d left");
  tiles.addSpacer();
  miniStat(tiles, "month", d1(monthFrac * 100) + "%", daysLeftMonth + "d left");

  w.addSpacer(GAP);
  hairline(w, innerW);
  w.addSpacer(GAP);

  // ---------- LIFE ----------
  headerRow(w, innerW, "Life " + MID + " age " + d1(ageNow) + " of " + CONFIG.targetAge,
                        nf(weeksLeft) + " weeks left", 12);
  w.addSpacer(3);
  txt(w, d1(lifeFrac * 100) + "%", Font.boldSystemFont(NUM), C.textHi, { min: 0.5 });
  w.addSpacer(LEAD);

  const KICK = 14;
  const gridH = innerH - (KICK + 3 + LINE + LEAD + BARH + STRIP + GAP + TILES + GAP + 1 + GAP
                          + KICK + 3 + LINE + LEAD + LEAD + CAP);
  const gb = w.addStack();
  gb.layoutHorizontally();
  gb.size = new Size(innerW, gridH);
  addGrid(gb, innerW, gridH);
  gb.addSpacer();

  w.addSpacer();
  txt(w, APX + " " + nf(summersLeft) + " summers " + MID + " " + APX + " " +
         nf(sundaysLeft) + " Sundays remaining",
      Font.systemFont(12), C.label);
}

function miniStat(parent, label, val, sub) {
  const s = parent.addStack();
  s.layoutVertically();
  kicker(s, label, false, 10);
  s.addSpacer(2);
  txt(s, val, Font.semiboldSystemFont(16), C.textMid);
  s.addSpacer(1);
  txt(s, sub, Font.systemFont(10), C.label);
}

// ============================================================
//  SMALL  -  one hero per widget
// ============================================================
function buildSmall(w, hero, cds) {
  const box = widgetBox("small");
  const PAD = 14;
  const innerW = box.w - PAD * 2;
  w.setPadding(PAD, PAD, PAD, PAD);

  if (hero === "life") {
    headerRow(w, innerW - 44, "Life " + MID + " age " + Math.floor(ageNow), null);
    w.addSpacer();
    txt(w, d1(lifeFrac * 100) + "%", Font.boldSystemFont(36), C.textHi, { min: 0.5 });
    w.addSpacer(9);
    const gb = w.addStack();
    gb.layoutHorizontally();
    gb.size = new Size(innerW, 42);
    addGrid(gb, innerW, 42);
    gb.addSpacer();
    w.addSpacer(8);
    txt(w, nf(weeksLeft) + " weeks left", Font.systemFont(11), C.label);
    return;
  }

  if (hero === "countdown") {
    const cd = nearestCountdown(cds);
    if (!cd) {
      w.addSpacer();
      txt(w, "No countdowns", Font.semiboldSystemFont(17), C.textMid);
      w.addSpacer(4);
      txt(w, "tap to add one", Font.systemFont(12), C.label);
      w.addSpacer();
      return;
    }
    const accent = cd.urgent ? C.amber : C.textHi;
    headerRow(w, innerW - 44, cd.title.slice(0, 11), null);
    w.addSpacer();
    txt(w, "D-" + Math.max(0, cd.daysLeft), Font.boldSystemFont(44), accent, { min: 0.5 });
    w.addSpacer(12);
    bar(w, innerW, 12, cd.pct / 100,
        cd.urgent ? "#F0A400" : C.accentDeep, cd.urgent ? C.amber : C.accent);
    w.addSpacer(8);
    txt(w, cd.date, Font.systemFont(11), C.label);
    return;
  }

  // default: year
  headerRow(w, innerW - 44, String(now.getFullYear()), null);
  w.addSpacer();
  txt(w, Math.round(yearFrac * 100) + "%", Font.boldSystemFont(52), C.textHi, { min: 0.5 });
  w.addSpacer(12);
  bar(w, innerW, 12, yearFrac);
  w.addSpacer(8);
  txt(w, nf(daysLeftYear) + " days left", Font.systemFont(11), C.label);
}

function buildWidget() {
  const data = loadData();
  const cds = computeCountdowns(data.countdowns);
  const family = config.widgetFamily || "medium";
  const hero = (args.widgetParameter || "year").trim().toLowerCase();

  const w = new ListWidget();
  const box = widgetBox(family);
  // kitty waves from the top-right corner; each layout reserves room for her
  const KIT = {
    small:  { w: 46, x: box.w - 50, y: 3 },
    medium: { w: 52, x: box.w - 56, y: 3 },
    large:  { w: 62, x: box.w - 68, y: 6 },
  };
  backdrop(w, box, KIT[family] || KIT.medium);
  if (family === "medium") buildMedium(w);
  else if (family === "large") buildLarge(w);
  else buildSmall(w, hero, cds);

  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
  return w;
}

// ============================================================
//  DASHBOARD (HTML presented in a WebView)
// ============================================================
function buildData() {
  const data = loadData();
  const cds = computeCountdowns(data.countdowns);
  const t = now;
  let hh = t.getHours();
  const ap = hh >= 12 ? "pm" : "am";
  hh = hh % 12; if (hh === 0) hh = 12;
  const updated = hh + ":" + String(t.getMinutes()).padStart(2, "0") + " " + ap;
  return {
    place: CONFIG.place,
    year: now.getFullYear(),
    updated,
    yearPct: d1(yearFrac * 100),
    daysLeftYear,
    tiles: {
      day:   { pct: d1(dayFrac * 100),   sub: hLeft + "h " + mLeft + "m left" },
      week:  { pct: d1(weekFrac * 100),  sub: daysLeftWeek + " days left" },
      month: { pct: d1(monthFrac * 100), sub: daysLeftMonth + " days left" },
      year:  { pct: d1(yearFrac * 100),  sub: "wk " + weekOfYear + " of 52" },
    },
    life: {
      pct: d1(lifeFrac * 100),
      age: d1(ageNow),
      yearsLeft: d1(yearsLeft),
      daysLeft: nf(daysLeftLife),
    },
    grid: { total: totalWeeks, lived: weeksLived, nowIndex: weeksLived, cols: 52, rows: CONFIG.targetAge },
    felt: { weeksLeft: nf(weeksLeft), summers: nf(summersLeft), sundays: nf(sundaysLeft) },
    reflection,
    countdowns: cds,
    targetAge: CONFIG.targetAge,
  };
}

function dashboardHTML(D) {
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
:root{
  --ink:${C.bgBot}; --panel:${C.panel}; --hair:${C.hairline}; --empty:${C.dotEmpty};
  --track:${C.track}; --accent:${C.accent}; --accentdim:${C.accentDeep}; --hi:${C.textHi};
  --label:${C.label}; --ember:${C.ember}; --amber:${C.amber};
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{background:
   radial-gradient(120% 70% at 50% 0%, ${C.bgTop} 0%, ${C.bgMid} 55%, ${C.bgBot} 100%) no-repeat,
   ${C.bgBot};
  color:var(--hi);font:16px/1.4 -apple-system,system-ui,sans-serif;
  padding:max(20px,env(safe-area-inset-top)) 20px max(28px,env(safe-area-inset-bottom));
  -webkit-font-smoothing:antialiased}
.wrap{max-width:520px;margin:0 auto}
.mono{font-family:ui-monospace,'SF Mono',Menlo,monospace;font-variant-numeric:tabular-nums}
.muted{color:var(--label)}
.accent{color:var(--accent)}
section{margin-bottom:26px}
.kicker{font-size:11px;color:var(--label);margin-bottom:8px;letter-spacing:.09em;text-transform:uppercase;font-weight:600}

/* hero */
.hero h1{font-size:30px;font-weight:640;line-height:1.15;letter-spacing:-.01em}
.bar{height:14px;background:var(--track);border-radius:999px;overflow:hidden;margin:14px 0 10px}
.bar>i{display:block;height:100%;width:0;border-radius:999px;
  background:linear-gradient(90deg,var(--accentdim),var(--accent));
  transition:width .7s cubic-bezier(.22,1,.36,1)}
.hero .sub{font-size:15px;color:var(--hi)}
.stamp{font-size:12px;color:var(--label);margin-top:6px}

/* tiles */
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tile{background:var(--panel);border-radius:16px;padding:14px;border:1px solid var(--hair)}
.tile .row{display:flex;justify-content:space-between;align-items:baseline}
.tile .lab{font-size:11px;letter-spacing:.09em;color:var(--label);text-transform:uppercase;font-weight:600}
.tile .val{font-size:22px;font-weight:600}
.tile .b{height:6px;background:var(--track);border-radius:999px;overflow:hidden;margin:9px 0 7px}
.tile .b>i{display:block;height:100%;width:0;background:var(--accentdim);border-radius:999px;transition:width .7s cubic-bezier(.22,1,.36,1)}
.tile .s{font-size:11px;color:var(--label)}

/* life card */
.card{background:var(--panel);border-radius:16px;padding:16px;border:1px solid var(--hair)}
.card h2{font-size:18px;font-weight:600;margin-bottom:2px}
.card .b3{display:flex;gap:14px;margin-top:14px}
.card .b3 .c{flex:1}
.card .b3 .n{font-size:17px;font-weight:600}
.card .b3 .l{font-size:11px;color:var(--label);margin-top:2px}

/* life in weeks */
#grid{display:flex;flex-direction:column;gap:3px}
.grow{display:flex;align-items:center;gap:6px}
.grow.decade{margin-top:5px}
.age{width:16px;text-align:right;font-size:9px;color:var(--label);flex:0 0 16px}
.dots{display:grid;grid-template-columns:repeat(52,1fr);gap:3px;flex:1}
.dot{aspect-ratio:1;border-radius:1.5px;background:var(--empty);opacity:.75;
  transform:scale(.6);animation:pop .35s ease-out forwards;animation-delay:var(--d,0ms)}
.dot.lived{background:var(--accent);opacity:1}
.dot.now{background:var(--ember);opacity:1;animation:pop .35s ease-out forwards,breathe 2.4s ease-in-out 1s infinite;
  box-shadow:0 0 6px 1px rgba(${rgb(C.ember)},.5)}
@keyframes pop{to{transform:scale(1)}}
@keyframes breathe{0%,100%{transform:scale(1);box-shadow:0 0 5px 1px rgba(${rgb(C.ember)},.45)}
  50%{transform:scale(1.45);box-shadow:0 0 10px 3px rgba(${rgb(C.ember)},.8)}}
.felt{font-size:12px;color:var(--label);margin-top:16px;line-height:1.7}
.felt b{color:var(--accent);font-weight:600}
.reflect{font-style:italic;font-size:15px;color:var(--label);margin-top:10px}

/* countdowns */
.cd{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--hair);
  border-radius:14px;padding:12px 14px;margin-bottom:8px}
.cd .meta{flex:0 0 auto;min-width:96px}
.cd .t{font-size:14px;font-weight:600}
.cd .dt{font-size:11px;color:var(--label)}
.cd .b{flex:1;height:8px;background:var(--track);border-radius:999px;overflow:hidden}
.cd .b>i{display:block;height:100%;width:0;background:var(--accent);border-radius:999px;transition:width .7s cubic-bezier(.22,1,.36,1)}
.cd.urgent .b>i{background:var(--amber)}
.cd .d{flex:0 0 auto;font-size:18px;font-weight:700;color:var(--accent);min-width:54px;text-align:right}
.cd.urgent .d{color:var(--amber)}
.add{display:flex;align-items:center;justify-content:center;border:1px dashed var(--empty);border-radius:14px;
  padding:12px;color:var(--label);font-size:14px}
.foot{text-align:center;font-size:11px;color:var(--label);margin-top:18px}

@media (prefers-reduced-motion: reduce){
  .dot{animation:none!important;transform:none;opacity:.75}
  .dot.lived,.dot.now{opacity:1}
  .bar>i,.tile .b>i,.cd .b>i{transition:none}
}
</style></head><body><div class="wrap">

<section class="hero">
  <div class="kicker">${D.year}</div>
  <h1><span class="accent mono">${D.yearPct}%</span> of ${D.year} has passed</h1>
  <div class="bar"><i data-w="${D.yearPct}"></i></div>
  <div class="sub mono"><span class="accent">${nf(D.daysLeftYear)}</span> days remaining in ${D.year}</div>
  <div class="stamp">Updated ${D.updated} &middot; ${D.place}</div>
</section>

<section class="tiles">
  ${["day", "week", "month", "year"].map(k => `
  <div class="tile">
    <div class="row"><span class="lab">${k}</span><span class="val mono">${D.tiles[k].pct}%</span></div>
    <div class="b"><i data-w="${D.tiles[k].pct}"></i></div>
    <div class="s mono">${D.tiles[k].sub}</div>
  </div>`).join("")}
</section>

<section>
  <div class="card">
    <h2>Life &middot; <span class="accent mono">${D.life.pct}%</span> lived</h2>
    <div class="muted" style="font-size:12px">toward age ${D.targetAge}</div>
    <div class="bar"><i data-w="${D.life.pct}"></i></div>
    <div class="b3">
      <div class="c"><div class="n mono">${D.life.age}</div><div class="l">age</div></div>
      <div class="c"><div class="n mono">${D.life.yearsLeft}</div><div class="l">years left</div></div>
      <div class="c"><div class="n mono">${D.life.daysLeft}</div><div class="l">days left</div></div>
    </div>
  </div>
</section>

<section>
  <div class="kicker">Your life in weeks &middot; 1 dot = 1 week &middot; ${nf(D.grid.total)} total</div>
  <div id="grid"></div>
  <div class="felt">&asymp; <b>${D.felt.weeksLeft}</b> weeks left &middot; &asymp; <b>${D.felt.summers}</b> summers &middot; &asymp; <b>${D.felt.sundays}</b> Sundays remaining</div>
  <div class="reflect">${D.reflection}</div>
</section>

<section>
  <div class="kicker">Countdowns</div>
  <div id="cds"></div>
  <div class="add" onclick="addCountdown()">+ Add countdown</div>
</section>

<div class="foot">${D.place} &middot; life expectancy ${D.targetAge} &middot; tap to refresh</div>
</div>
<script>
const D = ${JSON.stringify(D)};
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// build the life-in-weeks grid
(function(){
  const g = D.grid, host = document.getElementById('grid');
  let idx = 0;
  for (let r = 0; r < g.rows; r++){
    const row = document.createElement('div');
    row.className = 'grow' + (r > 0 && r % 10 === 0 ? ' decade' : '');
    const age = document.createElement('div');
    age.className = 'age';
    age.textContent = (r % 10 === 0 && r > 0) ? r : '';
    const dots = document.createElement('div');
    dots.className = 'dots';
    for (let c = 0; c < g.cols; c++){
      const d = document.createElement('div');
      d.className = 'dot' + (idx < g.lived ? ' lived' : (idx === g.nowIndex ? ' now' : ''));
      if (!reduce) d.style.setProperty('--d', Math.min(idx * 0.45, 900) + 'ms');
      const myAge = r, wk = idx + 1;
      d.onclick = () => tip(d, 'wk ' + wk.toLocaleString() + ' \\u00B7 age ' + myAge);
      dots.appendChild(d); idx++;
    }
    row.appendChild(age); row.appendChild(dots); host.appendChild(row);
  }
})();

// build countdowns
(function(){
  const host = document.getElementById('cds');
  if (!D.countdowns.length){
    host.innerHTML = '<div class="muted" style="font-size:13px;padding:4px 2px 10px">No countdowns yet.</div>';
    return;
  }
  D.countdowns.forEach(c => {
    const row = document.createElement('div');
    row.className = 'cd' + (c.urgent ? ' urgent' : '');
    const dlabel = c.past ? 'past' : ('D-' + c.daysLeft);
    row.innerHTML =
      '<div class="meta"><div class="t">' + c.title + '</div><div class="dt">' + c.date + '</div></div>' +
      '<div class="b"><i data-w="' + c.pct + '"></i></div>' +
      '<div class="d mono">' + dlabel + '</div>';
    host.appendChild(row);
  });
})();

// animate all bars after first paint
requestAnimationFrame(() => requestAnimationFrame(() => {
  document.querySelectorAll('[data-w]').forEach(i => { i.style.width = Math.min(100, parseFloat(i.dataset.w)) + '%'; });
}));

let tipEl;
function tip(el, txt){
  if (tipEl) tipEl.remove();
  tipEl = document.createElement('div');
  tipEl.textContent = txt;
  tipEl.style.cssText = 'position:fixed;z-index:9;background:var(--ember);color:' + C.bgBot + ';font:11px ui-monospace,monospace;padding:4px 7px;border-radius:6px;transform:translate(-50%,-130%);pointer-events:none';
  const r = el.getBoundingClientRect();
  tipEl.style.left = r.left + r.width/2 + 'px';
  tipEl.style.top = r.top + 'px';
  document.body.appendChild(tipEl);
  setTimeout(() => { if (tipEl){ tipEl.remove(); tipEl = null; } }, 1600);
}

function addCountdown(){
  const a = document.querySelector('.add');
  a.textContent = 'To add: tap the widget \\u2192 "Add countdown"';
  a.style.color = 'var(--accent)';
}
</script></body></html>`;
}

// ============================================================
//  EMBEDDED ARTWORK
//  Source PNG with the background flood-filled to transparent and cropped at
//  the shirt hem. Not a redraw - the surviving pixels are byte-identical to
//  the original (verified: 0 colour drift across 228,752 ink pixels).
// ============================================================
// The anniversary marker: his portrait, cropped square to head and
// shoulders at 88px. The source PNG was already transparent.
const AVATAR_B64 = "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";

const KITTY_B64 = "iVBORw0KGgoAAAANSUhEUgAAAMgAAADNCAYAAAD9lT8tAAAQAElEQVR4AexdB4AURdb+Xs9sZFlyVBQwgkoyHXgKomJEEBOiZzgV0xnPHH69M2dRzzs9IyZAxZwVFT0wg4IYUEERJbOkzTP9f1/N9jA7Owu7yywsuj39uqpeVb1K71V4Vd3jofFqrIHGGqi2BhoFpNqqaZgeV111lXfaaaf12GOPPY474ogjHqU5vlevXuP79+8//thjj31q0KBBx51++um9fN+3hlmCjStXjQKykbTXjjvumLH55puf9Mwzz5T9+9///mLixIkPjxs37hiah0ydOvWQ995775BHH330sDfffPNh+k/ZZpttFu21117XjRgxYvP1VUQJ5c0339yDAnzc/vvvf9mee+75TF5e3jPMe6RLly7+Jpts4m+11VZ+9+7df6QgP3nxxRcPXF95q2s6jQJS15pbT/EmTZqUs++++x47Z86c0p9++um/06ZNq9RmZgazGJBBEcB3333XcsKECZc8//zzs8mgt1555ZWbpTvL06dPz7z00kt7kNmP7tu37zgyfvSiiy764t///vfDr7766jXvvPPOsJUrVw777LPPvFmzZmHu3LmYOXMmZsyY0YWCPPy22257e++9977tlVdeyUp33tJFr1Jlp4toI5301MAZZ5zR6vjjjx/3xhtvPLJgwYK1EjWLCYpZzFSEVatW4fPPPz/v3nvv/elvf/vbCOHWBThq5fXu3bv70KFDbz366KNLbrjhhi/eeuutxz788MPDv/nmGyegZrH0zao3lYeysjK8/fbb51577bVvkG6mcA0NvPrLUCPldakB9sSbsWdd8P333x+kUaE6Wn6Fh8kiqHAHhpk5qwTsnnvueXz48OHvEFGrdn/xxRdzBwwYsCXhhnPPPXcFp3RfPffcc+d98cUXiEajDkizzjdHyT3Gjh37TJ0J1GPEWlVUPeajkXRCDdx///27/ec///mJ0xJPDGhm8WkUrXF7iI6w7yNMwQgxvtwMSZvvenJaYjfDiI4EjYw4YNttt51355135sc8q3/+/e9/b33YYYedcMEFF6zgGmfmu+++e5GmSdXHqL2P8iR49tlnDzrrrLP2qz2F+o3RKCD1W7+1pv7www9vd955532wYsUKJwh8wAGFwCP4lISmMPTOaIVzmvXCg5sOxpOdhuLBjgfi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";

// ============================================================
//  ENTRY
// ============================================================
async function presentDashboard() {
  const wv = new WebView();
  await wv.loadHTML(dashboardHTML(buildData()));
  await wv.present(true);
}

async function addCountdownFlow() {
  const a = new Alert();
  a.title = "New countdown";
  a.addTextField("Title (e.g. Trip to Bali)");
  a.addTextField("Date  YYYY-MM-DD");
  a.addAction("Add");
  a.addCancelAction("Cancel");
  const r = await a.present();
  if (r === -1) return false;
  const title = a.textFieldValue(0).trim();
  const date = a.textFieldValue(1).trim();
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const data = loadData();
  data.countdowns.push({ title, date, from: new Date().toISOString().slice(0, 10) });
  saveData(data);
  return true;
}

if (config.runsInWidget) {
  Script.setWidget(buildWidget());
  Script.complete();
} else {
  const menu = new Alert();
  menu.title = "Life & Time";
  menu.message = "View your dashboard, or add a countdown.";
  menu.addAction("Open dashboard");
  menu.addAction("Add countdown");
  menu.addCancelAction("Close");
  const choice = await menu.present();
  if (choice === 1) await addCountdownFlow();
  await presentDashboard();
  Script.complete();
}
