# Shutdown Loop page — design

Status: draft for review · 2026-11-18 · amended 2026-11-23 (CAN latch, adaptive staleness, scylla-server status: ADR 0009)

*Terminology:* "node" on this page means a **loop node** (an element of the series loop, `LoopNode` in code), not a glossary **Node** (a CAN device). Faults are attributed to glossary Nodes (`Vcu`, `Bms`).

## Intent

The shutdown circuit is a single series loop: GLV 24 V flows through every switch, kill button, latch and interlock and finally holds the AIRs closed. When any element opens, the line is dead from that point on, so **every node downstream also reads open**. Today, looking at raw shutdown booleans, a single fault looks like half the car failed.

This page answers one question, live, trackside: **which node broke the loop?** It shows a side view of the car with each shutdown node where it physically lives, plus an in-order strip of the loop, and it blames only the first open stretch — downstream nodes are shown as "open because of upstream", not as faults.

## Goals

- Live view of every shutdown node's state, updating as messages arrive.
- Identify the root-cause segment (first open reading) and visually separate it from downstream cascade.
- Show where each node sits on the car (side view).
- Make clear which nodes have no reading of their own, and how that widens the suspect stretch.

## Non-goals

- No historical replay / scrubbing through recorded runs on this page. Live only. (scylla-server records the loop status with each Run, so history is available to the graph page, Grafana and Rules; a replay view here is future work.)
- No Zenoh, schema or database migration changes. *(Amended:)* scylla-server now computes the same loop status and publishes it as datapoints and Faults (see Data and ADR 0009); the page still works without it.
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
| VCU (CAN 0x502, "Faults") | `VCU/Faults/Critical/CAN_OUTGOING_FAULT`, `CAN_INCOMING_FAULT`, `BMS_CAN_MONITOR_FAULT`, `LIGHTNING_CAN_MONITOR_FAULT`, `PRECHARGE_FLOATING_FAULT` | 0 = clear. Not a loop voltage: the **CAN latch** reading is derived from them (see Status algorithm). |

Topic definitions: `Odyssey-Definitions/can-messages/vcu.json` and `bms.json`. Values arrive via `Storage.get(topic)` (`DataValue { values: string[]; time; unit }`), same as the efuses page.

**Published by scylla-server** (ADR 0009), from the topics above. scylla evaluates once per burst of input (25 ms after its first message), at the next staleness, grace or hold deadline, and every second while any input is live; the status topics go out on change and on those heartbeats, and once (Unknown) when every input has gone stale, then not until a new input arrives. Datapoints carry the car's timestamp of the newest input that produced them. Stored with the current Run like car data, so they have history and can carry Rules (Rule values are floats: write `a < 0.5`). Node indexes follow the loop order below.

| Topic | Values |
|---|---|
| `Argos/Shutdown/Verdict` | 1 = closed, 0 = open, -1 = unknown |
| `Argos/Shutdown/Break_Node` | index of *F* (first live measurement point reading 0), -1 if none |
| `Argos/Shutdown/Node_States` | one code per loop node: 0 closed, 1 suspect, 2 downstream-open, 3 no data, 4 downstream-open with mismatch |
| `Argos/Shutdown/Mismatch` | 1 while any mismatch is flagged |
| `Argos/Shutdown/CAN_Latch` | derived CAN latch, 1 = every critical fault clear / 0 = one tripped; not sent while unknown |
| `Argos/Shutdown/Fault/{Vcu\|Bms}/{name}` | 1 every second while a Fault is active, 0 once when it clears |

Faults (glossary sense, shown on the Faults page), on the board whose reading saw them:

- `Shutdown_Open_<A>` when the suspect stretch is the single loop node A, `Shutdown_Open_<A>_TO_<B>` when it runs from first suspect A to last suspect B (e.g. `BMS_GPIO` = 0 ⇒ `Vcu/Shutdown_Open_SIDE_BRB_R_TO_BMS_LATCH`), on the board of the break reading. None when every suspect is an operator switch (GLV master switch, TSMS, HVD): those openings are recorded in `Verdict` / `Break_Node` only. None when the stretch is just the CAN latch: its trip raises only the per-fault Faults below.
- `Shutdown_Mismatch_<NODE>` on the board of the contradicting reading.
- `CAN_Latch_<FAULT>` on `Vcu` for each live tripped critical fault.

A Fault is raised only once it has been called for continuously for 500 ms, and a `Shutdown_Open_*` only once a message on the break reading's topic (for the CAN latch, a 0x502 message) has arrived since: a cross-board opening seen right after the other board closed waits for that board's fresh sample. So a real opening shorter than 500 ms shows in `Verdict` / `Break_Node` history and on the page but is not a Fault. A Fault clears (one 0) as soon as it is no longer called for; while the verdict is Unknown it is held instead, neither refreshed nor cleared until its board reads again.

## Loop model

Ordered list of nodes (source of truth lives in one TS constant, `SHUTDOWN_LOOP`; scylla-server mirrors it in `shutdown_loop/model.rs` and a `cargo test` asserts the two match). Nodes without a reading are listed so they appear on the car and in the strip.

| # | Node | Reading | Kind |
|---|---|---|---|
| 1 | GLV master switch | — | switch |
| 2 | Side BRB R | — | kill button |
| 3 | Side BRB L | — | kill button |
| 4 | BMS latch | `BMS_GPIO` | latch |
| 5 | IMD latch | `IMD_GPIO` | latch |
| 6 | BSPD latch | `BSPD_GPIO` | latch |
| 7 | CAN latch | derived from the VCU critical faults | latch |
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

Order of rows 1–14 follows the netmap shutdown diagram; latch order BMS → IMD → BSPD (rows 4–6) and sense order Acc → TSIP → TS− → TS+ (rows 15–18) confirmed by the user. The four BMS sense points sit after the EM interlock.

*(Amended 2026-11-23:)* the draft's row 2, "VCU feeds the loop" (kind *source*, no reading), was replaced in the build by the **CAN latch** after the BSPD latch: the VCU's place in the loop is the latch it opens on a critical CAN fault, which, unlike "VCU feeds", can be read (from CAN 0x502). The spec now follows the code; the latch's position after BSPD is the builder's and should be checked against the netmap diagram. The VCU powering the loop is still used as evidence: while any VCU reading is live, the GLV master switch is known closed.

**Energy meter placeholder:** no reading yet, so it behaves like any other unmeasured node. It shows closed when the loop is closed past it, downstream-open when the break is upstream of it, and **suspect** when it falls inside the suspect stretch (e.g. `HVD_GPIO` = 1, `Acc_Sense` = 0 ⇒ suspects: EM interlock, Acc sense) — user's choice, since it is the unmeasured part in that gap. It carries a small "placeholder — no reading yet" tag.

## Status algorithm

Pure function `computeLoopStatus(nodes, readings, now) → LoopStatus` in `shutdown-loop.utils.ts`, called with `withDerivedReadings(readings, now)`, no Angular dependency, unit-tested; scylla-server's `compute_loop_status` (`shutdown_loop/status.rs`) is a port of it, and both run the golden vectors in `shutdown-loop.vectors.json`.

1. Walk nodes in order. Only nodes with a live reading are "measurement points".
2. Find the **first measurement point reading 0**. Call it *F*. Let *P* be the last measurement point before *F* (or the loop start if none).
3. Statuses:
   - Nodes up to and including *P*: **closed**.
   - Nodes after *P* up to and including *F*: **suspect** (the root-cause stretch). If *F* is the first node after *P*, it's a single culprit; otherwise the whole stretch is suspect, e.g. `BMS_GPIO` = 0 ⇒ Side BRB R, Side BRB L, BMS latch are suspects.
   - Nodes after *F*: **downstream-open** (muted, explicitly "not the cause").
   - Unmeasured nodes before the break: closed (inferred). With no break, an unmeasured node is closed only if a live reading after it reads 1, or every measurement point is live; otherwise no data. AIRs: energized iff the verdict is LOOP CLOSED.
   - **CAN latch reading** (derived, not published by the car): 0 while any **live** critical VCU fault is tripped; 1 only while all five are live and 0; none otherwise. A stale fault counts as unknown, never as tripped (the draft build kept every fault value forever). *(Amended:)* the CAN latch's reading shows only an opening: a live tripped fault makes it a measurement point reading 0; otherwise it is treated as unmeasured, never a mismatch and never "no data" of its own (it never makes a board silent, and is no evidence that the GLV master switch is closed). The faults say whether one is tripped, not whether there is loop voltage after the latch, which can stay latched after its fault clears.
4. If no reading is 0: everything closed, AIRs energized.
5. **Contradiction:** a measurement point after *F* reading 1 is flagged **mismatch** (sensor/wiring inconsistency), shown on that node and as a header warning. The banner verdict stays "LOOP OPEN" (decided by *F*). *(Builder's call:)* a mismatch is only flagged after both values have held for a short grace window (0.5 s). *(Amended:)* a reading from another source must also have been **received at least the grace window after the break appeared**: VCU and BMS sample independently, and so do the VCU's 0x123 GPIOs and the 0x502 faults behind the CAN latch, so until the other source sends a fresh sample its last one may predate the break (with a BMS slower than 2 Hz the draft flashed a mismatch on every break).
6. **Staleness:** a reading whose last update is older than its timeout, or that has never arrived since page load, is **no data** (grey), and is skipped as a measurement point (it neither closes nor opens the stretch; the suspect stretch widens over it). *(Amended:)* the timeout is **per reading** (so per CAN frame), not per board: a message on one frame, the derived CAN latch or `BMS/Shutdown/State` no longer keeps another frame's readings live. It **adapts to the observed rate**: 5 × the smoothed message interval, clamped to **3–60 s**; until a second message arrives it is 60 s (the user's original value, now the cap). A message after a reading went stale starts it afresh (no change time or rate carried across the gap), so a reconnect gets its own grace window and a publisher that slowed down is relearnt instead of flapping stale.
7. **Banner verdict** *(builder's call)*, three states:
   - **LOOP OPEN** — a live reading is 0. Names the suspect(s).
   - **LOOP CLOSED · AIRs on** — every measurement point is live and reads 1.
   - **UNKNOWN** — no live 0, but one or more measurement points have no data (includes page load before first message). Names which board(s) are silent (a board with a measured loop node in no data). Never show "closed" off stale data.
8. **Server status** *(amended)*: while scylla-server's `Argos/Shutdown/Node_States` is fresh (received within 2 s) and has one valid code per loop node, the page shows its node states (scylla sees every message, and its status is exempt from the socket discard; a client may have some car data discarded) with local values and ages; otherwise, and while the dev mock panel publishes (`ShutdownLoopService.preferServer` off), it computes locally. The chosen source is on `LoopStatus.source`. Receive times, staleness and grace windows use a monotonic clock in both, never the wall clock.

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
│ GLVMS ─ BRB R ─ BRB L ─ BMS ─ IMD ─ BSPD ─ CAN ─ MC ─ BOTS ─ ... │  ← loop strip
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

- Angular conventions in `docs/CONTEXT.md` (Conventions) and ADR 0007: standalone, OnPush, signals + `computed()`, external templates, `inject()`, Tailwind on theme tokens, `<ui-icon>`, no emojis.
- Follow the efuses page pattern: `shutdown-page.topics.ts` + `Storage.get()` subscriptions; new route + nav-bar entry via `app-routes.ts`.
- Local dev: the Calypso sim randomizes each VCU shutdown bit independently (0 with 80% probability) and defines no `sim_freq` for BMS 0x95, so the sim shows near-constant breaks and mismatches and can't demo a healthy loop. *(Builder's call:)* logic is covered by unit tests on the pure function; for visual checks, add a dev-only fixture/mock-publish path inside the frontend. No changes to `Odyssey-Definitions`.

## Left to the builder

- Node coordinates on the car drawing and the drawing itself (rough positions from the netmap car view: GLVMS/TSMS behind the cockpit near the main hoop, side BRBs on the main hoop, dashboard/cockpit BRB/inertia at the front cockpit, BOTS at the pedal box, LFIU/latches in the E-Box, MC/HV_C at the rear, TSIP/HVD near the rear on the accumulator side, accumulator sense/AIRs in the accumulator).
- Component split, nav icon, and route name (`/shutdown` suggested).
