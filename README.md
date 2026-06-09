# SINGULARITY

*Start with dust. End with a universe.*

A Suika-style merge game in a circular gravity well. Objects fall toward the **center** (radial gravity), not downward. Merge dust into asteroids, asteroids into moons, moons into planets, planets into stars — and when two Stars touch, the **entire board collapses into a single Solar System** and you keep playing one scale of magnitude up.

When the board overflows past the Event Horizon, you don't get a Game Over — you get a **Supernova**: the board detonates, everything converts into Stardust, and the tally is the receipt of your progress.

## Play

Open `index.html` in any modern browser (or serve it: `python3 -m http.server` → http://localhost:8000). Mobile-portrait friendly; touch and mouse both work.

- **Drag** anywhere to move the launcher around the rim and aim.
- **Release** to drop the queued object.
- Two identical objects touching merge into the next tier. Chain merges within 0.6s multiply Stardust (×2, ×3…).
- Keep everything inside the glowing Event Horizon ring — anything fully outside it for 1.5s triggers a Supernova.

### Merge chains

- **Scale 1 — Stellar Nursery:** Dust Mote → Pebble → Asteroid → Comet → Moon → Rocky Planet → Gas Giant → Star. *Star + Star = SCALE COLLAPSE.*
- **Scale 2 — Galactic Field:** Protostar → Solar System → Binary Stars → Star Cluster → Nebula → Dwarf Galaxy → Spiral Galaxy → Quasar. *Quasar + Quasar = THE BIG CRUNCH.*

## Status

**Phase 0 — playable core** ✅: single-file HTML5 prototype, Matter.js physics, radial gravity that strengthens with board mass, full Scale 1 + Scale 2 chains, chain multipliers, Supernova tally, Scale Collapse, Big Crunch endgame, best-score persistence.

**Phase 1 — feel & fidelity pass** ✅ (this build):
- Pre-rendered celestial art: atmospheres, terminator shadows, ring systems, orbiting planets in the Solar System token, twinkling clusters, rotating spiral arms, pulsing quasar jets
- Launcher glides to your finger (tap *or* drag) — no teleporting, smoothed parallax
- Scale Collapse rebuilt: your actual pieces spiral in and are absorbed one by one into a growing core that ignites into the next scale — then the camera pulls back
- Supernova rebuilt as an expanding shockwave that detonates your pieces as it passes
- Difficulty tuned (and regression-tested headlessly): mindless spam reliably ends in a Supernova; deliberate play reaches the first Star in run 1
- Dev panel (⚙ bottom-right) for playtesting: spawn tiers, force collapse/supernova, jump to Scale 2, +stardust, clear board

Upcoming per the design doc: **Phase 2** meta layer (upgrade tree, Codex, rare variants) · **Phase 3** Daily Anomaly + tuning · **Phase 4** mobile wrap + go-to-market · **Phase 5** LiveOps.
