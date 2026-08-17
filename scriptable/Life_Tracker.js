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
    { m: 1,  d: 1,  emoji: "\uD83C\uDF86", label: "New Year" },
    { m: 2,  d: 14, emoji: "\uD83D\uDC98", label: "Valentine's Day" },
    { easter: true, emoji: "\uD83D\uDC23", label: "Easter" },
    { m: 4,  d: 25, emoji: "\uD83C\uDF6A", label: "Anzac Day" },
    { m: 7,  d: 13, avatar: true,           label: "Anniversary" },
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
//  EMBEDDED ARTWORK
//  The anniversary marker. Supplied PNG, cropped square to head and
//  shoulders and scaled to 88px - it renders at ~13pt, so that is still
//  a little over 2x on a 3x screen.
// ============================================================
const AVATAR_B64 = "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";

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
