/* app.js — Position Roulette v3 */
(function () {
  "use strict";

  var POSITIONS = window.POSITIONS, CATS = window.CATEGORIES, PEOPLE = window.PEOPLE,
      MODIFIERS = window.MODIFIERS, Figures = window.Figures;

  var TILE_H = 120, WIN_H = 168, CENTER_OFF = (WIN_H - TILE_H) / 2;
  var LAND_INDEX = 44, STRIP_LEN = 50, SPIN_MS = 4200;
  var DIFF_WORDS = ["", "Beginner", "Easy", "Spicy", "Advanced", "Expert"];
  var DIFF_COLORS = ["", "#39d98a", "#9fe23f", "#ffd23f", "#ff8c42", "#ff4d6d"];
  var LS = "pr_state_v3";

  var state = {
    people: 2, activeCats: {}, diffMin: 1, diffMax: 5, sound: true, challenge: false, hideBanned: true,
    favorites: [], banned: [], spinning: false, history: [], hasSpun: false
  };

  var $ = function (id) { return document.getElementById(id); };
  var reel, spinBtn, emptyMsg;

  // ===================== Persistence =====================
  function save() {
    try {
      localStorage.setItem(LS, JSON.stringify({
        people: state.people, activeCats: state.activeCats, diffMin: state.diffMin, diffMax: state.diffMax,
        sound: state.sound, challenge: state.challenge, hideBanned: state.hideBanned,
        favorites: state.favorites, banned: state.banned
      }));
    } catch (e) {}
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(LS) || "{}");
      ["people","diffMin","diffMax","sound","challenge","hideBanned"].forEach(function (k) { if (s[k] !== undefined) state[k] = s[k]; });
      if (s.activeCats) state.activeCats = s.activeCats;
      if (Array.isArray(s.favorites)) state.favorites = s.favorites;
      if (Array.isArray(s.banned)) state.banned = s.banned;
    } catch (e) {}
  }

  // ===================== Gate =====================
  function initGate() {
    var gate = $("gate"), app = $("app");
    if (localStorage.getItem("pr_age_ok") === "1") { gate.classList.add("hidden"); app.classList.remove("hidden"); }
    $("enterBtn").addEventListener("click", function () {
      try { localStorage.setItem("pr_age_ok", "1"); } catch (e) {}
      gate.classList.add("hidden"); app.classList.remove("hidden");
    });
  }

  // ===================== Tabs =====================
  function initTabs() {
    $("tabSpin").addEventListener("click", function () { switchView("spin"); });
    $("tabBrowse").addEventListener("click", function () { switchView("browse"); });
  }
  function switchView(v) {
    var spin = v === "spin";
    $("viewSpin").classList.toggle("hidden", !spin);
    $("viewBrowse").classList.toggle("hidden", spin);
    $("tabSpin").setAttribute("data-on", spin ? "true" : "false");
    $("tabBrowse").setAttribute("data-on", spin ? "false" : "true");
    if (!spin) buildCatalog($("browseSearch").value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ===================== People selector =====================
  function buildPeople() {
    var box = $("peopleSel"); box.innerHTML = "";
    Object.keys(PEOPLE).forEach(function (key) {
      var p = PEOPLE[key], n = parseInt(key, 10);
      var el = document.createElement("button");
      el.className = "people-btn";
      el.setAttribute("data-on", n === state.people ? "true" : "false");
      el.innerHTML = '<span class="pe">' + p.emoji + '</span><span class="pl">' + p.label + "</span>";
      el.addEventListener("click", function () {
        state.people = n; save();
        Array.prototype.forEach.call(box.children, function (c, i) { c.setAttribute("data-on", (i === n - 1) ? "true" : "false"); });
        buildChips(); refreshAvailability();
        if (!state.hasSpun) showPlaceholder();
      });
      box.appendChild(el);
    });
  }

  // ===================== Filters =====================
  function catsForPeople() {
    var set = {};
    POSITIONS.forEach(function (p) { if (p.people === state.people) p.cats.forEach(function (c) { set[c] = true; }); });
    return Object.keys(CATS).filter(function (k) { return set[k]; });
  }
  function buildChips() {
    var box = $("catChips"); box.innerHTML = "";
    catsForPeople().forEach(function (key) {
      var c = CATS[key];
      if (state.activeCats[key] === undefined) state.activeCats[key] = true;
      var el = document.createElement("button");
      el.className = "chip"; el.textContent = c.label;
      paintChip(el, key, c);
      el.addEventListener("click", function () {
        state.activeCats[key] = !(state.activeCats[key] !== false);
        paintChip(el, key, c); save(); refreshAvailability(); updateSummary();
      });
      box.appendChild(el);
    });
    updateSummary();
  }
  function paintChip(el, key, c) {
    var on = state.activeCats[key] !== false;
    el.setAttribute("data-on", on ? "true" : "false");
    el.style.background = on ? c.color : "rgba(255,255,255,0.04)";
    el.style.borderColor = on ? c.color : "rgba(255,255,255,0.10)";
    el.style.color = on ? "#160a14" : "";
  }
  function updateSummary() {
    var rel = catsForPeople(), on = rel.filter(function (k) { return state.activeCats[k] !== false; });
    var d = state.diffMin === state.diffMax ? ("=" + state.diffMin) : (state.diffMin + "–" + state.diffMax);
    $("filtersSummary").textContent = PEOPLE[state.people].label + " · " +
      (on.length === rel.length ? "all categories" : on.length + "/" + rel.length + " cats") + " · diff " + d;
  }
  function initFilters() {
    $("filtersToggle").addEventListener("click", function () {
      var open = $("filtersBody").classList.toggle("hidden") === false;
      $("filtersCaret").classList.toggle("open", open);
      this.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $("catAll").addEventListener("click", function () { setAllCats(true); });
    $("catNone").addEventListener("click", function () { setAllCats(false); });

    var lo = $("diffMin"), hi = $("diffMax");
    lo.value = state.diffMin; hi.value = state.diffMax;
    function paintRange() {
      $("diffRangeVal").textContent = state.diffMin === state.diffMax ? state.diffMin : (state.diffMin + " – " + state.diffMax);
    }
    paintRange();
    lo.addEventListener("input", function () {
      state.diffMin = parseInt(lo.value, 10);
      if (state.diffMin > state.diffMax) { state.diffMax = state.diffMin; hi.value = state.diffMax; }
      paintRange(); save(); refreshAvailability(); updateSummary();
    });
    hi.addEventListener("input", function () {
      state.diffMax = parseInt(hi.value, 10);
      if (state.diffMax < state.diffMin) { state.diffMin = state.diffMax; lo.value = state.diffMin; }
      paintRange(); save(); refreshAvailability(); updateSummary();
    });

    var ch = $("challengeToggle"); ch.checked = state.challenge;
    ch.addEventListener("change", function () { state.challenge = ch.checked; save(); });
    var hb = $("hideBanned"); hb.checked = state.hideBanned;
    hb.addEventListener("change", function () { state.hideBanned = hb.checked; save(); refreshAvailability(); });
  }
  function setAllCats(on) { catsForPeople().forEach(function (k) { state.activeCats[k] = on; }); buildChips(); save(); refreshAvailability(); }

  function activeList() {
    return POSITIONS.filter(function (p) {
      if (p.people !== state.people) return false;
      if (p.diff < state.diffMin || p.diff > state.diffMax) return false;
      if (state.hideBanned && state.banned.indexOf(p.id) !== -1) return false;
      return p.cats.some(function (c) { return state.activeCats[c] !== false; });
    });
  }
  function refreshAvailability() {
    var none = activeList().length === 0;
    spinBtn.disabled = none || state.spinning;
    emptyMsg.classList.toggle("hidden", !none);
  }

  // ===================== Tiles =====================
  function diffColor(d) { return DIFF_COLORS[d]; }
  function pipsHTML(diff, w) {
    var h = "";
    for (var i = 1; i <= 5; i++) h += '<i style="' + (w ? "width:" + w + "px;" : "") + "background:" + (i <= diff ? diffColor(diff) : "rgba(255,255,255,0.14)") + '"></i>';
    return h;
  }
  function tileHTML(p) {
    var c = CATS[p.cats[0]];
    return '<div class="tile"><div class="tile-stripe" style="background:' + c.color + '"></div>' +
      '<div class="tile-fig">' + Figures.render(p.pose, { flip: p.flip }) + "</div>" +
      '<div class="tile-info"><div class="tile-name">' + p.name + "</div>" +
      '<div class="tile-cat">' + p.cats.map(function (k) { return CATS[k].label; }).join(" · ") + "</div>" +
      '<div class="tile-pips">' + pipsHTML(p.diff) + "</div></div></div>";
  }
  function randFrom(list) { return list[Math.floor(Math.random() * list.length)]; }

  function showPlaceholder() {
    reel.style.transition = "none";
    reel.style.transform = "translateY(" + (-(TILE_H - CENTER_OFF)) + "px)";
    reel.innerHTML = '<div class="tile placeholder">🎰</div><div class="tile placeholder">PULL THE LEVER</div><div class="tile placeholder">🍑🍆💦</div>';
  }

  // ===================== Spin =====================
  function spin() {
    if (state.spinning) return;
    var list = activeList();
    if (!list.length) { refreshAvailability(); return; }
    state.spinning = true; state.hasSpun = true; spinBtn.disabled = true;
    spinBtn.classList.add("pressed"); setTimeout(function () { spinBtn.classList.remove("pressed"); }, 180);
    leverClunk(); triggerHaptic(30);

    var chosen = randFrom(list), strip = [];
    for (var i = 0; i < STRIP_LEN; i++) strip.push(i === LAND_INDEX ? chosen : randFrom(list));
    reel.innerHTML = strip.map(tileHTML).join("");

    reel.classList.add("blur");
    reel.style.transition = "none"; reel.style.transform = "translateY(0px)";
    void reel.offsetHeight;
    reel.style.transition = "transform " + SPIN_MS + "ms cubic-bezier(0.10,0.72,0.10,1)";
    reel.style.transform = "translateY(" + (-(LAND_INDEX * TILE_H - CENTER_OFF)) + "px)";

    startTicks();
    setTimeout(function () { reel.classList.remove("blur"); }, SPIN_MS - 700);

    var done = false;
    function finish() { if (done) return; done = true; reel.removeEventListener("transitionend", finish); onLanded(chosen); }
    reel.addEventListener("transitionend", finish);
    setTimeout(finish, SPIN_MS + 120);
  }

  function pickModifier() {
    var ok = MODIFIERS.filter(function (m) {
      return (m.minP || 1) <= state.people && state.people <= (m.maxP || 5);
    });
    return ok.length ? randFrom(ok) : null;
  }

  function onLanded(p) {
    state.spinning = false; refreshAvailability(); stopTicks();
    jackpot(); burstConfetti(); triggerHaptic([0, 45, 35, 90]);
    var mod = state.challenge ? pickModifier() : null;
    if (mod) setTimeout(modifierDing, 260);
    renderResult(p, mod); pushHistory(p);
  }

  // ===================== Result =====================
  function legendHTML(pose) {
    var n = Figures.figureCount(pose);
    if (!n) return "";
    if (n > 4) return '<span><i style="background:' + Figures.colorAt(0) + '"></i>Group of ' + n + "</span>";
    var labels = n === 1 ? ["You"] : n === 2 ? ["Partner A", "Partner B"] : [];
    var out = "";
    for (var i = 0; i < n; i++) out += '<span><i style="background:' + Figures.colorAt(i) + '"></i>' + (labels[i] || ("Person " + (i + 1))) + "</span>";
    return out;
  }

  var currentResult = null;
  function renderResult(p, mod) {
    currentResult = p;
    $("result").classList.remove("hidden");
    $("resultSvg").innerHTML = Figures.render(p.pose, { flip: p.flip, neon: true, ground: true });
    $("resultLegend").innerHTML = legendHTML(p.pose);

    var catsBox = $("resultCats"); catsBox.innerHTML = "";
    p.cats.forEach(function (k) {
      var t = document.createElement("span"); t.className = "cat-tag"; t.textContent = CATS[k].label;
      t.style.background = CATS[k].color; catsBox.appendChild(t);
    });
    if (p.needsToy) { var toy = document.createElement("span"); toy.className = "cat-tag"; toy.textContent = "🧸 Toy"; toy.style.background = "#5ce0c8"; catsBox.appendChild(toy); }

    $("favBtn").setAttribute("data-on", state.favorites.indexOf(p.id) !== -1 ? "true" : "false");
    $("banBtn").setAttribute("data-on", state.banned.indexOf(p.id) !== -1 ? "true" : "false");
    $("resultName").textContent = p.name;
    $("resultTagline").textContent = p.tagline;

    var mc = $("modifierCard");
    if (mod) { mc.classList.remove("hidden"); $("modKind").textContent = mod.kind; $("modText").textContent = mod.text; }
    else mc.classList.add("hidden");

    var bar = $("diffBar").children;
    for (var i = 0; i < bar.length; i++) { bar[i].classList.remove("on"); bar[i].style.background = i < p.diff ? diffColor(p.diff) : "rgba(255,255,255,0.12)"; }
    var idx = 0, iv = setInterval(function () { if (idx >= p.diff) return clearInterval(iv); bar[idx].classList.add("on"); idx++; }, 90);
    $("diffWord").textContent = DIFF_WORDS[p.diff]; $("diffWord").style.color = diffColor(p.diff);

    var steps = $("resultSteps"); steps.innerHTML = "";
    p.steps.forEach(function (s) { var li = document.createElement("li"); li.textContent = s; steps.appendChild(li); });
    $("resultTip").textContent = p.tip;
    $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function pushHistory(p) {
    state.history = state.history.filter(function (x) { return x.id !== p.id; });
    state.history.unshift(p);
    if (state.history.length > 8) state.history.pop();
    renderChips("history", state.history, "No spins yet.");
  }
  function renderChips(boxId, items, emptyTxt) {
    var box = $(boxId); box.innerHTML = "";
    if (!items.length) { box.innerHTML = '<span class="empty-note">' + emptyTxt + "</span>"; return; }
    items.forEach(function (p) {
      var chip = document.createElement("button"); chip.className = "hchip"; chip.textContent = p.name;
      chip.addEventListener("click", function () { renderResult(p, null); });
      box.appendChild(chip);
    });
  }
  function favPositions() { return state.favorites.map(function (id) { return POSITIONS.filter(function (p) { return p.id === id; })[0]; }).filter(Boolean); }
  function renderFavorites() {
    var box = $("favorites"); box.innerHTML = "";
    var favs = favPositions();
    if (!favs.length) box.innerHTML = '<span class="empty-note">Tap ⭐ on a result to save it here.</span>';
    else favs.forEach(function (p) {
      var chip = document.createElement("button"); chip.className = "hchip"; chip.textContent = "⭐ " + p.name;
      chip.addEventListener("click", function () { renderResult(p, null); }); box.appendChild(chip);
    });
    if (state.banned.length) {
      var b = document.createElement("button"); b.className = "hchip"; b.textContent = "🚫 " + state.banned.length + " banned — clear";
      b.addEventListener("click", function () { state.banned = []; save(); refreshAvailability(); renderFavorites(); }); box.appendChild(b);
    }
  }
  function initResultButtons() {
    $("favBtn").addEventListener("click", function () {
      if (!currentResult) return;
      var i = state.favorites.indexOf(currentResult.id);
      if (i === -1) { state.favorites.push(currentResult.id); this.setAttribute("data-on", "true"); }
      else { state.favorites.splice(i, 1); this.setAttribute("data-on", "false"); }
      save(); renderFavorites(); triggerHaptic(20);
    });
    $("banBtn").addEventListener("click", function () {
      if (!currentResult) return;
      var i = state.banned.indexOf(currentResult.id);
      if (i === -1) { state.banned.push(currentResult.id); this.setAttribute("data-on", "true"); }
      else { state.banned.splice(i, 1); this.setAttribute("data-on", "false"); }
      save(); refreshAvailability(); renderFavorites(); triggerHaptic(20);
    });
    $("againBtn").addEventListener("click", function () { ensureAudio(); spin(); });
  }

  // ===================== Browse / catalog =====================
  function buildCatalog(filter) {
    var box = $("catalog"); box.innerHTML = "";
    var q = (filter || "").trim().toLowerCase();
    var shown = 0;
    Object.keys(PEOPLE).forEach(function (key) {
      var n = parseInt(key, 10);
      var list = POSITIONS.filter(function (p) {
        if (p.people !== n) return false;
        if (!q) return true;
        return p.name.toLowerCase().indexOf(q) !== -1 || p.cats.some(function (c) { return CATS[c].label.toLowerCase().indexOf(q) !== -1; });
      }).sort(function (a, b) { return a.diff - b.diff || a.name.localeCompare(b.name); });
      if (!list.length) return;
      var title = document.createElement("div"); title.className = "cat-group-title";
      title.textContent = PEOPLE[n].emoji + " " + PEOPLE[n].label + " · " + list.length;
      box.appendChild(title);
      list.forEach(function (p) { box.appendChild(catCard(p)); shown++; });
    });
    if (!shown) box.innerHTML = '<div class="browse-empty">No positions match “' + (filter || "") + "”.</div>";
    $("browseCount").textContent = shown + " of " + POSITIONS.length;
  }
  function catCard(p) {
    var el = document.createElement("button");
    el.className = "cat-card" + (state.banned.indexOf(p.id) !== -1 ? " banned" : "");
    var fav = state.favorites.indexOf(p.id) !== -1 ? "⭐ " : "";
    var meta = p.cats.map(function (k) { return CATS[k].label; }).join(" · ") + (p.needsToy ? " · 🧸" : "");
    el.innerHTML =
      '<div class="cat-card-fig">' + Figures.render(p.pose, { flip: p.flip }) + "</div>" +
      '<div class="cat-card-info"><div class="cat-card-name">' + fav + p.name + "</div>" +
      '<div class="cat-card-meta">' + meta + "</div>" +
      '<div class="cat-card-pips">' + pipsHTML(p.diff, 14) + "</div></div>";
    el.addEventListener("click", function () { renderResult(p, null); switchView("spin"); });
    return el;
  }
  function initBrowse() {
    var s = $("browseSearch");
    s.addEventListener("input", function () { buildCatalog(s.value); });
  }

  // ===================== Confetti =====================
  var cc, cctx, parts = [], raf = null;
  function setupConfetti() { cc = $("confetti"); cctx = cc.getContext("2d"); sizeC(); window.addEventListener("resize", sizeC); }
  function sizeC() { cc.width = window.innerWidth; cc.height = window.innerHeight; }
  function burstConfetti() {
    var colors = ["#ff4d8d","#46d6ff","#ffd23f","#a06bff","#3fd6a0","#ff7a45"];
    var cx = window.innerWidth / 2, cy = window.innerHeight * 0.32;
    for (var i = 0; i < 130; i++) {
      var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, size: 4 + Math.random() * 6,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, color: colors[(Math.random() * colors.length) | 0], life: 1 });
    }
    if (!raf) raf = requestAnimationFrame(stepC);
  }
  function stepC() {
    cctx.clearRect(0, 0, cc.width, cc.height);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.vy += 0.22; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.008;
      if (p.life <= 0 || p.y > cc.height + 40) { parts.splice(i, 1); continue; }
      cctx.save(); cctx.globalAlpha = Math.max(0, p.life); cctx.translate(p.x, p.y); cctx.rotate(p.rot);
      cctx.fillStyle = p.color; cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6); cctx.restore();
    }
    if (parts.length) raf = requestAnimationFrame(stepC); else { raf = null; cctx.clearRect(0, 0, cc.width, cc.height); }
  }

  // ===================== Sound =====================
  var actx = null, tickTimer = null;
  function ensureAudio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === "suspended") actx.resume(); }
  function tone(freq, dur, type, vol, when, glideTo) {
    if (!state.sound || !actx) return;
    var t = (when || actx.currentTime), o = actx.createOscillator(), g = actx.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function leverClunk() { ensureAudio(); tone(180, 0.12, "sawtooth", 0.10, actx && actx.currentTime, 70); tone(90, 0.18, "sine", 0.10); }
  function modifierDing() { tone(880, 0.12, "triangle", 0.06); tone(1320, 0.16, "triangle", 0.05, actx && actx.currentTime + 0.1); }
  function startTicks() {
    if (!state.sound || !actx) return;
    var t0 = performance.now();
    (function loop() { var e = performance.now() - t0; if (e > SPIN_MS - 220) return; tone(500 + Math.random() * 120, 0.025, "square", 0.025); tickTimer = setTimeout(loop, 45 + (e / SPIN_MS) * 240); })();
  }
  function stopTicks() { if (tickTimer) { clearTimeout(tickTimer); tickTimer = null; } }
  function jackpot() {
    if (!state.sound || !actx) return; var base = actx.currentTime;
    [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.3, "triangle", 0.06, base + i * 0.08); });
    for (var i = 0; i < 6; i++) tone(1800 + Math.random() * 1200, 0.08, "sine", 0.03, base + 0.45 + i * 0.05);
  }

  // ===================== Haptics =====================
  function triggerHaptic(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
    try { var s = $("hapticSwitch"); if (s) s.checked = !s.checked; } catch (e) {}
  }

  // ===================== Share =====================
  function initShare() {
    $("shareBtn").addEventListener("click", function () {
      var url = location.href, data = { title: "Position Roulette", text: "Spin for a random position 🎰", url: url };
      if (navigator.share) navigator.share(data).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast("Link copied!"); });
      else toast(url);
    });
  }
  var toastT = null;
  function toast(msg) {
    var el = $("toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.style.cssText = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#1c1030;border:1px solid rgba(255,255,255,.15);color:#fff;padding:10px 16px;border-radius:12px;z-index:70;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.5)"; document.body.appendChild(el); }
    el.textContent = msg; el.style.opacity = "1"; clearTimeout(toastT);
    toastT = setTimeout(function () { el.style.opacity = "0"; el.style.transition = "opacity .4s"; }, 1800);
  }

  // ===================== Discreet cover =====================
  function initCover() {
    var cover = $("cover");
    $("hideBtn").addEventListener("click", function () {
      var d = new Date(), h = d.getHours(), m = d.getMinutes();
      $("coverClock").textContent = ((h % 12) || 12) + ":" + (m < 10 ? "0" + m : m);
      cover.classList.remove("hidden");
    });
    cover.addEventListener("click", function () { cover.classList.add("hidden"); });
  }

  // ===================== Sound toggle =====================
  function initSound() {
    var b = $("soundBtn");
    function paint() { b.textContent = state.sound ? "🔊" : "🔇"; b.setAttribute("data-on", state.sound ? "true" : "false"); }
    paint();
    b.addEventListener("click", function () { state.sound = !state.sound; ensureAudio(); paint(); save(); if (state.sound) modifierDing(); });
  }

  // ===================== PWA =====================
  function initPWA() { if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) navigator.serviceWorker.register("sw.js").catch(function () {}); }

  // ===================== Init =====================
  function init() {
    reel = $("reel"); spinBtn = $("spinBtn"); emptyMsg = $("emptyMsg");
    load();
    initGate(); initTabs(); buildPeople(); buildChips(); initFilters(); initResultButtons(); initBrowse();
    initSound(); initShare(); initCover(); setupConfetti(); initPWA();
    renderChips("history", state.history, "No spins yet."); renderFavorites();
    showPlaceholder(); refreshAvailability();

    spinBtn.addEventListener("click", function () { ensureAudio(); spin(); });
    document.addEventListener("keydown", function (e) {
      if ((e.code === "Space" || e.code === "Enter") && !state.spinning && !$("app").classList.contains("hidden")
          && $("cover").classList.contains("hidden") && $("viewSpin").classList.contains("hidden") === false && e.target.tagName !== "INPUT") {
        e.preventDefault(); ensureAudio(); spin();
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
