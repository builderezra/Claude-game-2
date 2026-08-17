// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: hourglass-half;
// ============================================================
//  LIFE & TIME  -  a Scriptable widget + tap-to-open dashboard
//  ----------------------------------------------------------
//  HOW TO USE
//    1. Scriptable -> + (new script) -> paste ALL of this -> name it "Life & Time".
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
  birth: { y: 2007, m: 12, d: 5 },   // your birthday - month is 1-12
  targetAge: 85,                     // "assume I live to ___"
  place: "Perth",                    // shown on the dashboard
  weekStart: 1,                      // 1 = week starts Monday, 0 = Sunday
  dotUnit: "auto",                   // "auto" | "weeks" | "months" | "years"
                                     //   auto = finest unit that still renders crisply

  // Markers along the year bar. Emoji are written as \u escapes so the file
  // stays pure ASCII and cannot be mangled by copy/paste.
  markers: true,
  events: [                          // the big ones, drawn as emoji
    { easter: true, emoji: "\uD83D\uDC23", label: "Easter" },
    { m: 7,  d: 13, emoji: "\u2764\uFE0F", label: "Anniversary" },
    { m: 10, d: 31, emoji: "\uD83C\uDF83", label: "Halloween" },
    { m: 12, d: 5,  emoji: "\uD83C\uDF82", label: "Birthday" },
    { m: 12, d: 25, emoji: "\uD83C\uDF84", label: "Christmas" },
  ],
  holidays: true,                    // WA public holidays, as small ticks
};
// --------------------------------------------------

const MID  = "\u00B7";  // middle dot
const APX  = "\u2248";  // almost-equal
const DASH = "\u2014";  // em dash

// Palette
const C = {
  bgTop:    "#1B1F25",  bgMid:    "#101317",  bgBot:    "#08090B",
  panel:    "#141619",  hairline: "#272C33",  track:    "#22262C",
  dotEmpty: "#333941",  green:    "#32D74B",  greenDeep:"#12923A",
  textHi:   "#FFFFFF",  textMid:  "#C9CED5",  label:    "#8A9099",
  ember:    "#FF7A45",  amber:    "#FFD60A",
};

// ---------------- date math ----------------
const DAY  = 86400000;
const WEEK = 604800000;
const YEARMS = 365.2425 * DAY;

const birth = new Date(CONFIG.birth.y, CONFIG.birth.m - 1, CONFIG.birth.d);
const death = new Date(birth.getTime());
death.setFullYear(birth.getFullYear() + CONFIG.targetAge);
const now = new Date();

const clamp01 = x => Math.max(0, Math.min(1, x));
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
  g.colors = [new Color(c1 || C.greenDeep), new Color(c2 || C.green)];
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
    if (i < g.unit.lived)       rrect(dc, x, y, cell, cell, r, C.green);
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

// ---- backgrounds ----
function backdrop(w) {
  const g = new LinearGradient();
  g.colors = [new Color(C.bgTop), new Color(C.bgMid), new Color(C.bgBot)];
  g.locations = [0, 0.45, 1];
  g.startPoint = new Point(0, 0);
  g.endPoint = new Point(0.6, 1);
  w.backgroundGradient = g;
}

// ---- year-bar markers ----
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
    rrect(dc, Math.max(0, Math.min(w - TW, x - TW / 2)), 0, TW, h, TW / 2, C.label, 0.9);
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
    const t = cell.addText(m.emoji);
    t.font = Font.systemFont(size);
    t.lineLimit = 1;
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
  const r1 = w.addStack();
  r1.layoutHorizontally();
  r1.centerAlignContent();
  r1.size = new Size(innerW, 0);
  txt(r1, Math.round(yearFrac * 100) + "%", Font.boldSystemFont(NUM), C.textHi);
  r1.addSpacer(8);
  kicker(r1, String(now.getFullYear()));
  r1.addSpacer();
  kicker(r1, nf(daysLeftYear) + " days left", true);
  w.addSpacer(LEAD);
  bar(w, innerW, BARH, yearFrac);
  if (CONFIG.markers) markerStrip(w, innerW, TICKH, EMOJI, EMOJIH);

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
  headerRow(w, innerW, String(now.getFullYear()) + " " + MID + " week " + weekOfYear + " of 52",
                        nf(daysLeftYear) + " days left", 12);
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
    headerRow(w, innerW, "Life", "age " + Math.floor(ageNow));
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
    headerRow(w, innerW, cd.title.slice(0, 16), null);
    w.addSpacer();
    txt(w, "D-" + Math.max(0, cd.daysLeft), Font.boldSystemFont(44), accent, { min: 0.5 });
    w.addSpacer(12);
    bar(w, innerW, 12, cd.pct / 100,
        cd.urgent ? "#B98A00" : C.greenDeep, cd.urgent ? C.amber : C.green);
    w.addSpacer(8);
    txt(w, cd.date, Font.systemFont(11), C.label);
    return;
  }

  // default: year
  headerRow(w, innerW, String(now.getFullYear()), "wk " + weekOfYear);
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
  backdrop(w);
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
  --track:${C.track}; --green:${C.green}; --greendim:${C.greenDeep}; --hi:${C.textHi};
  --label:${C.label}; --ember:${C.ember}; --amber:${C.amber};
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{background:
   radial-gradient(120% 60% at 50% 0%, #1B1F25 0%, ${C.bgBot} 60%) no-repeat,
   ${C.bgBot};
  color:var(--hi);font:16px/1.4 -apple-system,system-ui,sans-serif;
  padding:max(20px,env(safe-area-inset-top)) 20px max(28px,env(safe-area-inset-bottom));
  -webkit-font-smoothing:antialiased}
.wrap{max-width:520px;margin:0 auto}
.mono{font-family:ui-monospace,'SF Mono',Menlo,monospace;font-variant-numeric:tabular-nums}
.muted{color:var(--label)}
.green{color:var(--green)}
section{margin-bottom:26px}
.kicker{font-size:11px;color:var(--label);margin-bottom:8px;letter-spacing:.09em;text-transform:uppercase;font-weight:600}

/* hero */
.hero h1{font-size:30px;font-weight:640;line-height:1.15;letter-spacing:-.01em}
.bar{height:14px;background:var(--track);border-radius:999px;overflow:hidden;margin:14px 0 10px}
.bar>i{display:block;height:100%;width:0;border-radius:999px;
  background:linear-gradient(90deg,var(--greendim),var(--green));
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
.tile .b>i{display:block;height:100%;width:0;background:var(--greendim);border-radius:999px;transition:width .7s cubic-bezier(.22,1,.36,1)}
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
.dot.lived{background:var(--green);opacity:1}
.dot.now{background:var(--ember);opacity:1;animation:pop .35s ease-out forwards,breathe 2.4s ease-in-out 1s infinite;
  box-shadow:0 0 6px 1px rgba(255,122,69,.6)}
@keyframes pop{to{transform:scale(1)}}
@keyframes breathe{0%,100%{transform:scale(1);box-shadow:0 0 5px 1px rgba(255,122,69,.5)}
  50%{transform:scale(1.45);box-shadow:0 0 10px 3px rgba(255,122,69,.85)}}
.felt{font-size:12px;color:var(--label);margin-top:16px;line-height:1.7}
.felt b{color:var(--green);font-weight:600}
.reflect{font-style:italic;font-size:15px;color:var(--label);margin-top:10px}

/* countdowns */
.cd{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--hair);
  border-radius:14px;padding:12px 14px;margin-bottom:8px}
.cd .meta{flex:0 0 auto;min-width:96px}
.cd .t{font-size:14px;font-weight:600}
.cd .dt{font-size:11px;color:var(--label)}
.cd .b{flex:1;height:8px;background:var(--track);border-radius:999px;overflow:hidden}
.cd .b>i{display:block;height:100%;width:0;background:var(--green);border-radius:999px;transition:width .7s cubic-bezier(.22,1,.36,1)}
.cd.urgent .b>i{background:var(--amber)}
.cd .d{flex:0 0 auto;font-size:18px;font-weight:700;color:var(--green);min-width:54px;text-align:right}
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
  <h1><span class="green mono">${D.yearPct}%</span> of ${D.year} has passed</h1>
  <div class="bar"><i data-w="${D.yearPct}"></i></div>
  <div class="sub mono"><span class="green">${nf(D.daysLeftYear)}</span> days remaining in ${D.year}</div>
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
    <h2>Life &middot; <span class="green mono">${D.life.pct}%</span> lived</h2>
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
  tipEl.style.cssText = 'position:fixed;z-index:9;background:var(--ember);color:#1b0f08;font:11px ui-monospace,monospace;padding:4px 7px;border-radius:6px;transform:translate(-50%,-130%);pointer-events:none';
  const r = el.getBoundingClientRect();
  tipEl.style.left = r.left + r.width/2 + 'px';
  tipEl.style.top = r.top + 'px';
  document.body.appendChild(tipEl);
  setTimeout(() => { if (tipEl){ tipEl.remove(); tipEl = null; } }, 1600);
}

function addCountdown(){
  const a = document.querySelector('.add');
  a.textContent = 'To add: tap the widget \\u2192 "Add countdown"';
  a.style.color = 'var(--green)';
}
</script></body></html>`;
}

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
