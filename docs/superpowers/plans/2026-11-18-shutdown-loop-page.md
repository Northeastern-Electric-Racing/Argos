# Shutdown Loop Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A live `/shutdown` page that shows every shutdown-loop node on a side view of the car and in an in-order strip, and blames only the first open stretch of the loop.

**Architecture:** A static loop model (ordered nodes, topics, car positions) feeds a pure function `computeLoopStatus` that turns the latest readings into per-node statuses and a verdict. A page-scoped service subscribes to `Storage` for the 13 topics, keeps readings in a signal, ticks a clock signal once a second, and exposes the computed status. Three presentational components (banner, strip, car view) render it. A dev-mode-only panel pushes fake readings into `Storage` for visual checks.

**Tech Stack:** Angular 19 (standalone, signals, OnPush), RxJS, Karma/Jasmine, inline SVG, Material icons.

**Spec:** `docs/spec/shutdown-loop-page/spec.md`

## Global Constraints

- Frontend only. No changes to `scylla-server/`, `Odyssey-Definitions`, Zenoh config.
- Reading semantics: `1` = closed (24 V present), `0` = open. Each GPIO reads the voltage **just after** its node.
- `BMS/Shutdown/State` is inverted: `0` = TS ON, `1` = TS OFF. Header chip only, not part of the walk.
- Staleness timeout: **60 000 ms** since last message from that **board** (VCU or BMS). A topic never received since page load is also no data.
- Mismatch grace window: **500 ms**.
- Angular conventions from `angular-client/CLAUDE.md`: no `standalone: true`, `ChangeDetectionStrategy.OnPush`, `input()`/`output()`, signals + `computed()`, `inject()`, external `templateUrl`/`styleUrls`, `@if`/`@for`, `class`/`style` bindings, Material icons via `mat-icon`, no emojis.
- Status never conveyed by colour alone (icon + text label per status). WCAG AA.
- Branch from `develop` as `{issue-number}-shutdown-loop-page`; commits `#{issue-number} - {description}`. Issue number comes from the spec issue once published. `<N>` below stands for it.

## Review Focus

1. **Page load before any message** → banner UNKNOWN naming both boards silent, never "LOOP CLOSED". Test in Task 2 (`unknown when no readings`).
2. **One board silent, other all 1s** (e.g. BMS cable unplugged) → UNKNOWN naming `BMS`, VCU nodes still green. Test in Task 2 (`unknown when BMS stale`).
3. **Stale reading inside the walk while a later live reading is 0** → stale node skipped, suspect stretch widens across it. Test in Task 2 (`stale node widens suspect stretch`).
4. **Non-numeric / NaN payload** (`values[0]` = `"abc"` or missing) → ignored, previous reading kept, no crash. Test in Task 3 (`ignores non-numeric values`).
5. **Value other than 0/1** (e.g. `2`) → treat non-zero as closed (matches existing `value !== 0` usage in `rtds-debug-card`). Test in Task 2 (`non-zero counts as closed`).

---

## File map

All under `angular-client/src/`:

| File | Responsibility |
|---|---|
| `pages/shutdown-page/shutdown-page.topics.ts` | Topic strings |
| `pages/shutdown-page/shutdown-loop.model.ts` | Types + ordered `SHUTDOWN_LOOP` node list |
| `pages/shutdown-page/shutdown-loop.utils.ts` (+ `.spec.ts`) | Pure `computeLoopStatus` |
| `pages/shutdown-page/shutdown-loop.service.ts` (+ `.spec.ts`) | Storage subscriptions, readings signal, clock, computed status |
| `pages/shutdown-page/components/loop-banner/` | Verdict banner + TS chip + mismatch warning |
| `pages/shutdown-page/components/loop-strip/` | In-order strip |
| `pages/shutdown-page/components/car-view/` | SVG car side view + markers + loop polyline |
| `pages/shutdown-page/components/mock-panel/` | Dev-mode fake-reading panel |
| `pages/shutdown-page/shutdown-page.component.*` (+ `.spec.ts`) | Page container |
| `app/app-routes.ts`, `app/app-routing.module.ts`, `app/app-nav-bar/app-nav-bar.component.ts` | Route + nav entry |

---

### Task 1: Topics and loop model

**Files:**
- Create: `pages/shutdown-page/shutdown-page.topics.ts`, `pages/shutdown-page/shutdown-loop.model.ts`
- Test: `pages/shutdown-page/shutdown-loop.model.spec.ts`

**Interfaces — Produces:**

```ts
// shutdown-page.topics.ts
export const SHUTDOWN_TOPICS = {
  VCU: { BMS: 'VCU/Shutdown/BMS_GPIO', IMD: 'VCU/Shutdown/IMD_GPIO', BSPD: 'VCU/Shutdown/BSPD_GPIO',
         HV_C: 'VCU/Shutdown/HV_C_GPIO', BOTS: 'VCU/Shutdown/BOTS_GPIO', INERTIA_SW: 'VCU/Shutdown/INERTIA_SW_GPIO',
         CKPT: 'VCU/Shutdown/CKPT_GPIO', TSMS: 'VCU/Shutdown/TSMS_GPIO', HVD: 'VCU/Shutdown/HVD_GPIO' },
  BMS: { Acc: 'BMS/Shutdown/Acc_Sense', TSIP: 'BMS/Shutdown/TSIP_Sense',
         TS_Minus: 'BMS/Shutdown/TS_Minus_Sense', TS_Plus: 'BMS/Shutdown/TS_Plus_Sense',
         State: 'BMS/Shutdown/State' }
} as const;

// shutdown-loop.model.ts
export type Board = 'VCU' | 'BMS';
export type NodeKind = 'source' | 'switch' | 'kill' | 'latch' | 'interlock' | 'sense' | 'load';
export interface LoopNode {
  id: string;            // stable kebab id, e.g. 'side-brb-r'
  label: string;         // e.g. 'Side BRB R'
  kind: NodeKind;
  topic?: string;        // absent = unmeasured
  board?: Board;         // present iff topic present
  placeholder?: boolean; // true only for EM interlock
  car: { x: number; y: number }; // % of car drawing width/height, 0–100
}
export const SHUTDOWN_LOOP: readonly LoopNode[];
```

`SHUTDOWN_LOOP` is the 19 rows of the spec's Loop model table, in that order, ids: `glvms, vcu, side-brb-r, side-brb-l, bms-latch, imd-latch, bspd-latch, mc-hvil, bots, inertia, cockpit-brb, tsms, hvd, em-interlock, acc-sense, tsip-sense, ts-minus, ts-plus, airs`. Car coordinates: rough positions from the spec's "Left to the builder" list; Task 6 tunes them.

- [ ] **Step 1: Write failing test** `shutdown-loop.model.spec.ts`:
  - `has 19 nodes in spec order` — `SHUTDOWN_LOOP.map(n => n.id)` equals the id list above.
  - `measured nodes have a board` — every node with `topic` has `board`, and vice versa.
  - `13 measured nodes` — count of nodes with `topic` is 13; `BMS/Shutdown/State` is not any node's topic.
  - `only em-interlock is placeholder`.
  - `car coords within 0–100`.
- [ ] **Step 2: Run** `npx ng test --include='**/shutdown-loop.model.spec.ts' --watch=false` → FAIL (module not found).
- [ ] **Step 3: Implement** both files.
- [ ] **Step 4: Run** same command → PASS.
- [ ] **Step 5: Commit** `#<N> - add shutdown loop model and topics`.

---

### Task 2: `computeLoopStatus`

**Files:**
- Create: `pages/shutdown-page/shutdown-loop.utils.ts`
- Test: `pages/shutdown-page/shutdown-loop.utils.spec.ts`

**Interfaces:**
- Consumes: `LoopNode`, `Board`, `SHUTDOWN_LOOP` (Task 1).
- Produces:

```ts
export interface Reading { value: number; receivedAt: number; changedAt: number; } // ms epoch
export type Readings = ReadonlyMap<string, Reading>;   // keyed by topic
export type BoardLastSeen = Partial<Record<Board, number>>; // ms epoch of last message per board
export type NodeState = 'closed' | 'suspect' | 'downstream-open' | 'no-data';
export interface NodeStatus { node: LoopNode; state: NodeState; value?: number; ageMs?: number; mismatch: boolean; }
// value/ageMs set only for measured nodes with a reading; ageMs = now - reading.receivedAt
export type Verdict = 'open' | 'closed' | 'unknown';
export interface LoopStatus {
  verdict: Verdict;
  nodes: NodeStatus[];      // same order as input nodes
  suspects: LoopNode[];     // empty unless verdict === 'open'
  silentBoards: Board[];    // boards with any measured node in no-data
  mismatch: boolean;        // any node.mismatch
  airsEnergized: boolean;   // verdict === 'closed'
}
export const STALE_AFTER_MS = 60_000;
export const MISMATCH_GRACE_MS = 500;
export function computeLoopStatus(nodes: readonly LoopNode[], readings: Readings, boardLastSeen: BoardLastSeen, now: number): LoopStatus;
```

**Algorithm** (spec "Status algorithm"):
1. A measured node is **live** iff it has a reading and `now - boardLastSeen[board] <= STALE_AFTER_MS`. Non-live measured nodes → `no-data`, skipped as measurement points.
2. Live value `!== 0` = closed reading; `=== 0` = open reading.
3. *F* = first live measured node reading 0. *P* = last live measured node before *F* (or none).
4. No *F*: every live measured node and unmeasured node → `closed`; verdict `closed` if no `no-data` nodes, else `unknown`. (Unmeasured nodes after the last live reading still render `closed` in `unknown` — the banner carries the uncertainty.)
5. *F* exists: nodes ≤ *P* → `closed` (no-data ones stay `no-data`); nodes after *P* through *F* → `suspect` except `no-data` measured nodes, which stay `no-data` but don't end the stretch; nodes after *F* → `downstream-open`, except no-data ones. Verdict `open`. `suspects` = the `suspect` nodes.
6. Mismatch: a live measured node after *F* reading non-zero, where `now - max(F.changedAt, node.changedAt) >= MISMATCH_GRACE_MS` → that node `mismatch: true` (state stays `downstream-open`).

- [ ] **Step 1: Write failing tests** in `shutdown-loop.utils.spec.ts`. Helper `allClosed(now)` builds readings with every topic = 1 and both boards seen at `now`; tests override individual topics. Use `SHUTDOWN_LOOP` as nodes.
  - `closed when all live and 1` — verdict `closed`, `airsEnergized` true, all states `closed`.
  - `unknown when no readings` — empty maps → verdict `unknown`, `silentBoards` = `['VCU','BMS']`, all 13 measured nodes `no-data`.
  - `unknown when BMS stale` — BMS last seen `now - 60_001` → verdict `unknown`, `silentBoards` = `['BMS']`, the 4 BMS sense nodes `no-data`, VCU nodes `closed`.
  - `not stale at exactly 60s` — BMS last seen `now - 60_000` → verdict `closed`.
  - `single culprit` — `TSMS_GPIO` = 0 and everything after = 0 → suspects ids `['tsms']`; `hvd`…`airs` `downstream-open`; `cockpit-brb` `closed`.
  - `unmeasured stretch is suspect` — `BMS_GPIO` = 0 onward → suspects `['side-brb-r','side-brb-l','bms-latch']`; `glvms`, `vcu` `closed`.
  - `em placeholder suspect` — `HVD_GPIO` = 1, `Acc_Sense` and later = 0 → suspects `['em-interlock','acc-sense']`.
  - `em placeholder closed when loop closed` — all 1 → `em-interlock` `closed`.
  - `em placeholder downstream when break upstream` — `TSMS_GPIO` = 0 onward → `em-interlock` `downstream-open`.
  - `stale node widens suspect stretch` — `HVD_GPIO` absent from `readings` (never received), `TSMS_GPIO` = 1, `Acc_Sense` and later = 0 → `hvd` state `no-data`; suspects `['em-interlock','acc-sense']`; `status.nodes` for `hvd` is inside the stretch (between `tsms` and `acc-sense`) but not listed as a suspect.
  - `mismatch after grace` — `BOTS_GPIO` = 0 (changedAt `now - 1000`), `TSMS_GPIO` = 1 (changedAt `now - 1000`) → `tsms` `mismatch` true, `downstream-open`, `status.mismatch` true, verdict still `open`.
  - `no mismatch within grace` — same but `changedAt = now - 499` → `mismatch` false.
  - `non-zero counts as closed` — all readings = 2 → verdict `closed`.
- [ ] **Step 2: Run** `npx ng test --include='**/shutdown-loop.utils.spec.ts' --watch=false` → FAIL.
- [ ] **Step 3: Implement** `computeLoopStatus` per the algorithm.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `#<N> - compute shutdown loop status from readings`.

---

### Task 3: `ShutdownLoopService`

**Files:**
- Create: `pages/shutdown-page/shutdown-loop.service.ts`
- Test: `pages/shutdown-page/shutdown-loop.service.spec.ts`

**Interfaces:**
- Consumes: `Storage` (`src/services/storage.service.ts`, `get(key): Subject<DataValue>`), `SHUTDOWN_TOPICS`, `SHUTDOWN_LOOP`, `computeLoopStatus`, `Reading`, `LoopStatus`.
- Produces:

```ts
@Injectable() // NOT providedIn root — provided by ShutdownPageComponent so subscriptions die with the page
export class ShutdownLoopService implements OnDestroy {
  readonly status: Signal<LoopStatus>;
  readonly tsOn: Signal<boolean | undefined>; // from BMS/Shutdown/State: 0 → true, 1 → false, never received → undefined
}
// Time source is Date.now(); tests control it with jasmine.clock().mockDate().
```

Subscribes once per measured topic + `State`. On each message: parse `Number(value.values[0])`, ignore NaN; set `receivedAt = now`, `changedAt` = previous `changedAt` if value unchanged else `now`; update the board's last-seen. Readings live in a `signal<Map<…>>` replaced (not mutated) per message. A `now` signal updated by `setInterval(…, 1000)` (cleared in `ngOnDestroy`) so staleness and grace expire without new messages. `status = computed(() => computeLoopStatus(SHUTDOWN_LOOP, readings(), lastSeen(), now()))`.

- [ ] **Step 1: Write failing tests** (TestBed, `providers: [ShutdownLoopService]`, real `Storage`, `jasmine.clock()` installed + `mockDate`):
  - `starts unknown` — `status().verdict === 'unknown'`, `tsOn()` undefined.
  - `closes when all topics report 1` — `storage.addValue(topic, { values: ['1'], time: '', unit: '' })` for all 13 → `verdict === 'closed'`.
  - `goes stale after 60s` — then `jasmine.clock().tick(61_000)` → `verdict === 'unknown'`.
  - `ignores non-numeric values` — after all-1, push `{ values: ['abc'] }` and `{ values: [] }` to `TSMS_GPIO` → still `closed`, no throw.
  - `tsOn maps inverted state` — `State` = 0 → `tsOn()` true; 1 → false.
  - `unsubscribes on destroy` — after `TestBed.resetTestingModule()` / service `ngOnDestroy()`, `storage.get(topic).observed` is false.
- [ ] **Step 2: Run** `npx ng test --include='**/shutdown-loop.service.spec.ts' --watch=false` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `#<N> - subscribe shutdown loop readings`.

---

### Task 4: Banner and loop strip components

**Files:**
- Create: `pages/shutdown-page/components/loop-banner/loop-banner.component.{ts,html,css,spec.ts}`, `pages/shutdown-page/components/loop-strip/loop-strip.component.{ts,html,css,spec.ts}`
- Create: `pages/shutdown-page/shutdown-loop.display.ts` — shared state → `{ label: string; icon: string; cssClass: string }` map.

**Interfaces:**
- Consumes: `LoopStatus`, `NodeStatus`, `NodeState`.
- Produces: `<loop-banner [status]="LoopStatus" [tsOn]="boolean | undefined" />`, `<loop-strip [nodes]="NodeStatus[]" />`, and

```ts
export const NODE_STATE_DISPLAY: Record<NodeState, { label: string; icon: string; cssClass: string }>;
// closed → 'Closed','check_circle','state-closed'; suspect → 'Open — cause','cancel','state-suspect';
// downstream-open → 'Open — upstream','arrow_downward','state-downstream'; no-data → 'No data','help','state-no-data'
```

Banner copy (exact):
- open, 1 suspect: `LOOP OPEN — cause: {label}`; >1: `LOOP OPEN — cause is one of: {labels joined ', '}`
- closed: `LOOP CLOSED · AIRs on`
- unknown: `UNKNOWN — no data from {boards joined ' and '}`
- mismatch warning (any verdict): `Sensor mismatch: {labels} read closed after the break`
- TS chip: `BMS: TS ON` / `BMS: TS OFF` / `BMS: TS —` when undefined.

Strip: one item per node in order, connector line between items coloured by the left node's state; each item shows `mat-icon` + label + `NODE_STATE_DISPLAY[state].label`; unmeasured nodes get a hollow marker and `title`/`aria-label` suffix ` (no sensor)`; EM placeholder shows tag `placeholder — no reading yet`. Horizontal scroll on narrow widths.

- [ ] **Step 1: Write failing tests:**
  - banner: renders each of the 4 copy cases above from hand-built `LoopStatus` fixtures (text match); TS chip three cases.
  - strip: renders 19 items for a `SHUTDOWN_LOOP`-derived input; suspect items have class `state-suspect`; `em-interlock` item contains `placeholder — no reading yet`; `glvms` item `aria-label` ends with `(no sensor)`.
- [ ] **Step 2: Run** `npx ng test --include='**/shutdown-page/components/loop-*/**/*.spec.ts' --watch=false` → FAIL.
- [ ] **Step 3: Implement** (OnPush, `input.required()`).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `#<N> - add shutdown banner and loop strip`.

---

### Task 5: Page, route, nav, mock panel

**Files:**
- Create: `pages/shutdown-page/shutdown-page.component.{ts,html,css,spec.ts}`, `pages/shutdown-page/components/mock-panel/mock-panel.component.{ts,html,css}`
- Modify: `app/app-routes.ts` (add `shutdownRoute = () => '/shutdown'` and export it), `app/app-routing.module.ts` (add `{ path: 'shutdown', component: ShutdownPageComponent }`), `app/app-nav-bar/app-nav-bar.component.ts` (add to `navMenuItems`: label `Shutdown`, icon `power_settings_new`)

**Interfaces:**
- Consumes: `ShutdownLoopService` (Task 3), banner + strip (Task 4), `Storage.addValue`.
- Produces: `ShutdownPageComponent` (default export, matches other pages), `providers: [ShutdownLoopService]`. Layout: banner, car-view slot (Task 6; leave a placeholder `<section>` here), strip, and `@if (devMode) { <shutdown-mock-panel /> }` where `devMode = isDevMode()`.
- Mock panel: one toggle per measured topic (0/1) + `State`, and presets `All closed`, `Break at TSMS`, `Break at BMS latch`, `Silence BMS` (stops publishing BMS). Publishes current values via `storage.addValue` every 1000 ms while the panel's `Publish` toggle is on.

- [ ] **Step 1: Write failing test** `shutdown-page.component.spec.ts`: `should create`; `renders banner and strip` (query `loop-banner`, `loop-strip` exist).
- [ ] **Step 2: Run** `npx ng test --include='**/shutdown-page.component.spec.ts' --watch=false` → FAIL.
- [ ] **Step 3: Implement** page, mock panel, route, nav item.
- [ ] **Step 4: Run** → PASS; then full `npx ng test --watch=false` → all PASS.
- [ ] **Step 5: Manual check** via `run-local` skill (`client-dev` profile): open `/shutdown`, toggle mock presets, confirm banner/strip states. Screenshots to `pictures/<branch>/`.
- [ ] **Step 6: Commit** `#<N> - add shutdown page route and mock panel`.

---

### Task 6: Car side view

**Files:**
- Create: `pages/shutdown-page/components/car-view/car-view.component.{ts,html,css,spec.ts}`
- Modify: `pages/shutdown-page/shutdown-page.component.html` (replace placeholder section), `pages/shutdown-page/shutdown-loop.model.ts` (tune `car` coords)

**Interfaces:**
- Consumes: `NodeStatus[]`, `NODE_STATE_DISPLAY`.
- Produces: `<car-view [nodes]="NodeStatus[]" />`.

Inline SVG in the template, `viewBox="0 0 1000 400"`, `preserveAspectRatio="xMidYMid meet"`: simplified side profile (nose, cockpit opening, main hoop, rear wing, two wheels, accumulator box) drawn with theme stroke colour via CSS custom properties. Node `car.x/y` % maps to `x*10, y*4`. Loop: one `<line>` per consecutive node pair, class from the left node's state. Markers: `<g role="img" tabindex="0" [attr.aria-label]="label + ': ' + stateLabel">` with circle (hollow if unmeasured) + short label; `<title>` text: `{label} · {topic} = {value} · {round(ageMs/1000)} s ago` for measured nodes with a reading, `{label} · no sensor` for unmeasured, `{label} · {topic} · no data` otherwise. Positions: follow netmap car view — GLVMS/TSMS behind cockpit near main hoop, side BRBs on main hoop, cockpit BRB/inertia at dash, BOTS at pedal box (front), latches/LFIU in E-Box (mid), MC/HV_C rear, HVD/TSIP rear-side, accumulator sense/TS±/AIRs at accumulator (mid-low).

- [ ] **Step 1: Write failing test:** renders 19 marker groups; 18 loop segments; marker for `tsms` has `aria-label` `TSMS: Open — cause` given a suspect fixture; `tsms` `<title>` reads `TSMS · VCU/Shutdown/TSMS_GPIO = 0 · 3 s ago` for `ageMs: 3000`.
- [ ] **Step 2: Run** `npx ng test --include='**/car-view/**/*.spec.ts' --watch=false` → FAIL.
- [ ] **Step 3: Implement** and wire into page.
- [ ] **Step 4: Run** → PASS; full suite PASS.
- [ ] **Step 5: Visual check** at 1440 px and 768 px widths, light and dark: markers don't overlap labels unreadably; tune coords. Screenshots to `pictures/<branch>/`.
- [ ] **Step 6: Lint/format:** `npx prettier --check "src/**/*.{ts,html,scss}" && npx ng lint` → clean.
- [ ] **Step 7: Commit** `#<N> - add shutdown car side view`.
