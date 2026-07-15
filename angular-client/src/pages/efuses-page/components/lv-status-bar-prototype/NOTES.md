# PROTOTYPE — LV Battery status bar (ticket #705, foundation for #709)

**Throwaway.** Delete this whole folder once the answer is captured; rewrite the winner as a
real `src/components/status-bar` + chip. Mounted on the real eFuses page (sub-shape A) behind
`?variant=`, dev-only floating switcher.

## Question

What should the LV Battery presentation look like as a reusable **status bar** — out of the
command zones, holding a small read-only chip, extendable to more pinned topics (#709)?

Settled so far:

- **Chip = variant C** (stacked: big value over a small "LV BATTERY" subtitle + status dot,
  green ok / red fault). Content-sized card, capped `max-width: 25vw`, never stretched.
- The **expansion is content-sized** — the bar only grows far enough to fit its chip(s); it is
  NOT a full-width strip. One chip (LV) sits on the right; more (#709) line up later.

Open: which **container shape** wins — top line drop-down vs side pull-out.

## Variants (container shape)

- **`line`** — full-width hairline pinned to the top (always present, flush at `top: 0`) with a
  drop-down tab on the right. Expanding drops a cohesive card (chip + collapse chevron) that
  hangs from the bar at the top-right. Sticky while scrolling.
- **`side`** — a right-edge sidebar pop-out, TOP-aligned: a handle at the top-right edge; opening
  slides out (animated) a sidebar flush to the edge holding the chip(s), close chevron top-right.
  Sticky while scrolling (pins to the top-right corner).

Rejected side attempts: a vertically-centred content-hugging drawer ("middle and weird"), and a
top-centre floating **island** capsule (that was a misread of "new style" — user wanted the side
pop-out fixed, not replaced).

Flip: `/efuses?variant=line|side` or the bottom switcher / ← → keys.

## Verdict

**`side` + Quick View won** (chip C locked). The status bar is a right-edge sidebar pop-out,
top-aligned, with a tiny "Quick view" header; it auto-opens and pins to the top-right corner
while scrolling. Wired live on the eFuses page.

Variant switching is retired: the page renders the one locked shape (no `?variant=`, no
switcher, no `line` branch). `prototype-switcher.prototype.ts`, the `line`/`island` shapes, and
`StatusBarItemComponent` + `LvChipA`/`LvChipB` are now unused — kept in the folder for now.
Fold the locked shape into a real `src/components/status-bar` + LV chip when #709 builds out
multi-chip pinning, then remove this folder.
