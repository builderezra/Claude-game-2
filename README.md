# 🎰 Position Roulette

A free, casino-style randomizer for sex positions. Pull the lever, watch the
reel spin, and land on a random position — shown as a stick-figure diagram with
a difficulty rating and a step-by-step how-to.

100% free. No accounts, no tracking, nothing sent to a server. It's a single
static web app — works on a phone or desktop.

## Run it

Just open `index.html` in a browser. Or serve the folder:

```bash
python3 -m http.server 4173
# then visit http://localhost:4173
```

## Features

- **18+ gate** before anything loads (remembered via localStorage).
- **Slot-machine spin** — blur, easing, marquee bulbs, gold lever, confetti.
- **Stick-figure diagrams** — two-color partners (pink + cyan), drawn as SVG.
- **Difficulty bar** (1–5) and **how-to tutorial** with a pro tip per position.
- **Filters** — toggle categories and cap max difficulty.
- **History** chips + spin counter, optional sound (off by default).

## Files

| File | What it does |
|------|--------------|
| `index.html` | Page structure |
| `styles.css` | Casino/neon theme |
| `figures.js` | Stick-figure pose renderer + pose skeletons |
| `data.js`    | The position deck (names, categories, difficulty, steps, tips) |
| `app.js`     | Gate, filters, spin animation, result rendering, confetti, sound |

## Add a position

Add an entry to the array in `data.js`:

```js
{
  id: "my-position", name: "My Position",
  cats: ["classic"],          // classic | oral | anal | standing | advanced
  diff: 2,                     // 1–5
  pose: "missionary",          // any key in figures.js POSES (optional `flip: true`)
  tagline: "Short hook.",
  steps: ["Step one.", "Step two."],
  tip: "One helpful tip."
}
```

To draw a brand-new pose, add a skeleton to `POSES` in `figures.js` (joint
coordinates in a 120×100 space) and reference its key from a position.
