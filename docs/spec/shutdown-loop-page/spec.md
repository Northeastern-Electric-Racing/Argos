# Shutdown Loop page — design

Status: draft for review · 2026-11-18

## Intent

The shutdown circuit is a single series loop: GLV 24 V flows through every switch, kill button, latch and interlock and finally holds the AIRs closed. When any element opens, the line is dead from that point on, so **every node downstream also reads open**. Today, looking at raw shutdown booleans, a single fault looks like half the car failed.

This page answers one question, live, trackside: **which node broke the loop?** It shows a side view of the car with each shutdown node where it physically lives, plus an in-order strip of the loop, and it blames only the first open stretch — downstream nodes are shown as "open because of upstream", not as faults.

## Goals

- Live view of every shutdown node's state, updating as messages arrive.
- Identify the root-cause segment (first open reading) and visually separate it from downstream cascade.
- Show where each node sits on the car (side view).
- Make clear which nodes have no reading of their own, and how that widens the suspect stretch.

## Non-goals

- No historical replay / scrubbing through recorded runs. Live only.
- No backend (scylla-server) or Zenoh/schema changes. Frontend only.
- No commands (cannot close/reset anything from this page).
- No faithful CAD-level car art.

## Anti-goals

- Painting downstream nodes red as if each one faulted — the exact confusion the page exists to remove.
- Showing a stale last-known value as if it were live.
- Silently hiding contradictory data (a downstream reading that says closed after an upstream one says open).

## Data

All values are booleans: **1 = closed (24 V present, energy can flow), 0 = open**. Each GPIO is a level-shifted reading of the loop voltage **just after** its node.

| Source | Topic | Notes |
|---|---|---|
| VCU (CAN 0x123, "Shutdown Pins") | `VCU/Shutdown/BMS_GPIO`, `IMD_GPIO`, `BSPD_GPIO`, `HV_C_GPIO`, `BOTS_GPIO`, `INERTIA_SW_GPIO`, `CKPT_GPIO`, `TSMS_GPIO`, `HVD_GPIO` | `HV_C` = MC HVIL interlock; `CKPT` = cockpit BRB |
| BMS (CAN 0x95, "Shutdown as read by BMS") | `BMS/Shutdown/Acc_Sense`, `TSIP_Sense`, `TS_Minus_Sense`, `TS_Plus_Sense` | |
| BMS | `BMS/Shutdown/State` | 0 = TS ON, 1 = TS OFF (note: inverted vs. the sense bits). Shown as a header summary, not part of the walk. |

Topic definitions: `Odyssey-Definitions/can-messages/vcu.json` and `bms.json`. Values arrive via `Storage.get(topic)` (`DataValue { values: string[]; time; unit }`), same as the efuses page.

## Loop model

Ordered list of nodes (source of truth lives in one TS constant). Nodes without a reading are listed so they appear on the car and in the strip.

| # | Node | Reading | Kind |
|---|---|---|---|
| 1 | GLV master switch | — | switch |
| 2 | VCU feeds the loop | — | source |
| 3 | Side BRB R | — | kill button |
| 4 | Side BRB L | — | kill button |
| 5 | BMS latch | `BMS_GPIO` | latch |
| 6 | IMD latch | `IMD_GPIO` | latch |
| 7 | BSPD latch | `BSPD_GPIO` | latch |
| 8 | MC HVIL interlock | `HV_C_GPIO` | interlock |
| 9 | BOTS | `BOTS_GPIO` | switch |
| 10 | Inertia switch | `INERTIA_SW_GPIO` | switch |
| 11 | Cockpit BRB | `CKPT_GPIO` | kill button |
| 12 | TSMS | `TSMS_GPIO` | switch |
| 13 | HVD | `HVD_GPIO` | interlock |
| 14 | Energy meter interlock | placeholder | interlock |
| 15 | Accumulator sense | `Acc_Sense` | sense |
| 16 | TSIP sense | `TSIP_Sense` | sense |
| 17 | TS− sense | `TS_Minus_Sense` | sense |
| 18 | TS+ sense | `TS_Plus_Sense` | sense |
| 19 | AIRs | — | load |

Order of rows 1–14 follows the netmap shutdown diagram; latch order BMS → IMD → BSPD (rows 5–7) and sense order Acc → TSIP → TS− → TS+ (rows 15–18) confirmed by the user. The four BMS sense points sit after the EM interlock.

**Energy meter placeholder:** no reading yet, so it behaves like any other unmeasured node. It shows closed when the loop is closed past it, downstream-open when the break is upstream of it, and **suspect** when it falls inside the suspect stretch (e.g. `HVD_GPIO` = 1, `Acc_Sense` = 0 ⇒ suspects: EM interlock, Acc sense) — user's choice, since it is the unmeasured part in that gap. It carries a small "placeholder — no reading yet" tag.

## Status algorithm

Pure function `computeLoopStatus(readings) → NodeStatus[]`, no Angular dependency, unit-tested.

1. Walk nodes in order. Only nodes with a live reading are "measurement points".
2. Find the **first measurement point reading 0**. Call it *F*. Let *P* be the last measurement point before *F* (or the loop start if none).
3. Statuses:
   - Nodes up to and including *P*: **closed**.
   - Nodes after *P* up to and including *F*: **suspect** (the root-cause stretch). If *F* is the first node after *P*, it's a single culprit; otherwise the whole stretch is suspect, e.g. `BMS_GPIO` = 0 ⇒ Side BRB R, Side BRB L, BMS latch are suspects.
   - Nodes after *F*: **downstream-open** (muted, explicitly "not the cause").
   - Unmeasured nodes before the break: closed (inferred). AIRs: energized iff no break.
4. If no reading is 0: everything closed, AIRs energized.
5. **Contradiction:** a measurement point after *F* reading 1 is flagged **mismatch** (sensor/wiring inconsistency), shown on that node and as a header warning. The banner verdict stays "LOOP OPEN" (decided by *F*). *(Builder's call:)* a mismatch is only flagged after it persists past a short grace window (~0.5 s), because VCU and BMS sample independently and will briefly disagree across the board boundary.
6. **Staleness:** a reading whose last update is older than a timeout, or that has never arrived since page load, is **no data** (grey), and is skipped as a measurement point (it neither closes nor opens the stretch; the suspect stretch widens over it). Timeout is per source board, since VCU and BMS publish independently. Both messages are sent periodically (exact rate unknown); timeout is **~60 s** with no message from that board (user's choice).
7. **Banner verdict** *(builder's call)*, three states:
   - **LOOP OPEN** — a live reading is 0. Names the suspect(s).
   - **LOOP CLOSED · AIRs on** — every measurement point is live and reads 1.
   - **UNKNOWN** — no live 0, but one or more measurement points have no data (includes page load before first message). Names which board(s) are silent. Never show "closed" off stale data.

## Page layout

```
┌ Shutdown Loop ──────────────────────────────────── [BMS: TS OFF] ┐
│ LOOP OPEN — suspect: Cockpit BRB          (or: LOOP CLOSED · AIRs on)
│                                                                  │
│      ┌─ side view of car (SVG) ──────────────────────────┐       │
│      │  markers at each node's position, loop line drawn │       │
│      │  node→node in order; green / red / muted / grey   │       │
│      └───────────────────────────────────────────────────┘       │
│                                                                  │
│ GLVMS ─ VCU ─ BRB R ─ BRB L ─ BMS ─ IMD ─ BSPD ─ MC ─ BOTS ─ ... │  ← loop strip
│   ●      ●      ●       ●      ●     ●     ●     ●    ●          │
└──────────────────────────────────────────────────────────────────┘
```

- **Header:** loop closed/open banner naming the suspect(s); `BMS/Shutdown/State` as a TS ON/OFF chip; mismatch warning if any.
- **Car view:** hand-drawn simplified side profile SVG (option A, chosen). Node markers positioned by coordinates in the loop constant (car-relative %, so the drawing scales). Loop polyline connects markers in order and is coloured per segment status. Hover/focus on a marker shows name, topic, value, last-updated age.
- **Loop strip:** linear in-order view of all 19 nodes; the main diagnostic read. Unmeasured nodes drawn distinctly (e.g. hollow) so the gap in coverage is visible. EM placeholder tagged.
- Status must not rely on colour alone (icon/label/pattern per status) — AXE / WCAG AA.

## Approaches considered

- **A. Own simplified SVG car side view + loop strip (chosen).** Fits Argos theme, scales, coordinates easy to tweak; art is simpler than netmap's.
- B. Reuse netmap's car drawing. Closest match, but another project's code: needs author OK and ongoing sync.
- C. Photo/render with overlaid markers. Most realistic, but blurs when scaled, ignores light/dark theme, redo when car changes.

## Constraints

- Angular 19 conventions in `angular-client/CLAUDE.md`: standalone, OnPush, signals + `computed()`, external templates/styles, `inject()`, Material icons, no emojis.
- Follow the efuses page pattern: `shutdown-page.topics.ts` + `Storage.get()` subscriptions; new route + nav-bar entry via `app-routes.ts`.
- Local dev: the Calypso sim randomizes each VCU shutdown bit independently (0 with 80% probability) and defines no `sim_freq` for BMS 0x95, so the sim shows near-constant breaks and mismatches and can't demo a healthy loop. *(Builder's call:)* logic is covered by unit tests on the pure function; for visual checks, add a dev-only fixture/mock-publish path inside the frontend. No changes to `Odyssey-Definitions`.

## Left to the builder

- Node coordinates on the car drawing and the drawing itself (rough positions from the netmap car view: GLVMS/TSMS behind the cockpit near the main hoop, side BRBs on the main hoop, dashboard/cockpit BRB/inertia at the front cockpit, BOTS at the pedal box, LFIU/latches in the E-Box, MC/HV_C at the rear, TSIP/HVD near the rear on the accumulator side, accumulator sense/AIRs in the accumulator).
- Component split, nav icon, and route name (`/shutdown` suggested).
