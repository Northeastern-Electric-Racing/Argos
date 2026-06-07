# Argos — Claude Code Instructions

Argos is a real-time telemetry platform for Northeastern Electric Racing (NER).
Angular 19 frontend (`angular-client/`) + Rust backend (`scylla-server/`) + schema tooling (`charybdis/`).

## Worktree Layout (CRITICAL)

This repo uses a **bare git repository** with worktrees. The root directory is NOT a normal checkout.

```
Argos-worktrees/
├── .bare/              # Bare git repo — NEVER modify directly
├── develop/            # Worktree for develop branch
├── <ticket-branch>/    # One worktree per ticket
├── add-worktree.sh     # Use this to create new worktrees
└── CLAUDE.md           # (you are here)
```

### Rules
- **NEVER** run git commands in the `Argos-worktrees/` root. Always `cd` into a worktree first.
- Treat each worktree as an independent checkout.
- Default worktree is `develop/` unless told otherwise.
- Use full absolute paths including the worktree name:
  `/Users/wyattbracy/Desktop/ner/app_software/Argos/Argos-worktrees/<worktree>/angular-client/src/...`

### Creating worktrees
Use `add-worktree.sh` — it creates the worktree and symlinks `.claude/settings.json` for consistent hooks:
```bash
./add-worktree.sh <branch-name>
```

### Other worktree operations
```bash
git worktree list                                        # List all worktrees
cd develop && git pull origin develop && cd ..           # Update develop
git worktree remove <path> && git branch -D <branch>     # Remove a worktree
```

## Branch & Ticket Convention

- Branch format: `{issue-number}-{kebab-case-title}` (e.g., `533-csv-upload-download-rules`)
- Always branch from `develop`, not `main`, unless explicitly told otherwise
- One branch/worktree per ticket. Ask before stacking work on an existing branch
- If no ticket number is provided, ask for one
- Use `/start-ticket <issue-number>` to automate branch + worktree creation from a GitHub issue

## Commit Convention

Format: `#{ticket-number} - {concise description}`

Use `/commit` to stage and commit with this convention automatically.

## PR Convention

Use `/open-pr` to run pre-PR checks, push, and open a draft PR against `develop`.
Use `/update-pr` to refresh a PR description after pushing new changes.

## Skills

| Skill | What it does |
|-------|-------------|
| `/start-ticket <issue>` | Create worktree + branch from a GitHub issue |
| `/commit` | Stage and commit with repo conventions |
| `/open-pr` | Lint, conflict-check, push, and open a draft PR |
| `/update-pr` | Refresh PR description from current diff |
| `/create-ticket` | Draft and create a GitHub issue |
| `/brainstorm-ticket` | Explore code and shape ticket drafts |
| `/cleanup-worktrees` | Remove worktrees for merged PRs |
| `/verify-telemetry` | Verify MQTT-displayed values end-to-end: subscription, CAN def, simulator, UI |
| `/verify-graph` | Playwright MCP verification of graph page: modes, controls, topics, rendering |
| `/run-local` | Bring up the local Argos environment (Docker backend + Angular client) for running and testing — checks the right compose profile (`client-dev` vs `scylla-dev`) based on what changed |

## Local Development

- **Backend stack** (Postgres, MQTT, Scylla server, Calypso simulator) runs in Docker — use compose files in `compose/`
- **Frontend client:** `cd angular-client && npm run start` (default port 4200)
- Angular build takes **~60-90s** on first compile
- **Multiple clients:** User often runs clients from multiple worktrees simultaneously. Use `/run-local` to bring up the backend (if needed) and auto-pick the next free Angular port.

### Picking the right compose profile

When bringing up the local stack (via `/run-local` or manually), pick the profile based on what's changed in the worktree:

- **Frontend-only changes** → `./argos.sh client-dev up` — runs everything in Docker, including scylla-server.
- **Changes to `scylla-server/`** → `./argos.sh scylla-dev up` (brings up Docker services EXCEPT scylla-server) + `cd scylla-server && cargo run` in a separate terminal. Running the Docker'd scylla while the worktree has scylla changes means you're testing a stale binary.

## Testing

- **Frontend:** `cd angular-client && ng test` (Karma/Jasmine)
- **Backend:** `cd scylla-server && cargo test`
- **Lint/format (frontend):** `npx prettier --check "src/**/*.{ts,html,scss}" && npx ng lint`
- **Build (backend):** `cargo build`

## Screenshots (Playwright)

All Playwright screenshots **must** be saved to the `pictures/` directory at the worktrees root, organized by branch:

```
Argos-worktrees/
└── pictures/
    └── <branch-name>/
        └── <descriptive-name>.png
```

### Rules
- **Path format:** `pictures/<branch-name>/<descriptive-name>.png`
- Use kebab-case descriptive filenames (e.g., `mobile-sidebar-open.png`)
- **Never** save screenshots to the worktrees root or inside worktree directories
- Full absolute path: `/Users/wyattbracy/Desktop/ner/app_software/Argos/Argos-worktrees/pictures/<branch>/<name>.png`

## Safety Rules

- Never modify `.env` or secret files without explicit user confirmation
- Never delete files without explicit user confirmation
- Always explain reasoning before making architectural changes

## Code Conventions

Frontend and backend coding rules are auto-loaded from `.claude/rules/` when editing files in their respective directories:
- `.claude/rules/frontend.md` — Angular/TypeScript conventions (loaded for `angular-client/` files)
- `.claude/rules/backend.md` — Rust/Axum conventions (loaded for `scylla-server/` files)

## Maintenance

Run `.claude/scripts/check-ticket-context.sh` after pulling develop to check if the ticket-context memory needs updating:
```bash
cd develop && ../.claude/scripts/check-ticket-context.sh
```

---

## Branch Context: seed-data-frontend

> Local-only branch for hard-coded seed data in the frontend. No ticket, no PR.

**Ticket:** (none — local only)
**Goal:** Provide deterministic, hard-coded, *judge-quality* telemetry so pages render a healthy, coherent car without a live MQTT feed (for demoing to competition judges). Models a well-balanced pack at ~82% SOC, actively charging, no faults.
**Screens covered (4):** Charging, BMS/Accumulator (+ segment view), eFuses, Rules. (Other pages still fall back to empty.)
**Key files / areas:**
- `angular-client/src/services/seed-data.service.ts` — the whole seed engine
- `angular-client/src/app/context/app-context.component.ts` — starts the service on app init (skips live MQTT wiring when seeding)
**Three delivery channels (a screen may need more than Storage values):**
- `storage.addValue(topic, …)` — plain `DataValue` on real MQTT topic names (BMS cells/aggregates, charging values, eFuse readings, nav msgs/sec + latency).
- `storage.addTimerValue(topic, TimerData)` — the charging status cards (ACTIVE/CHARGING/BALANCING/FAULTED) read this channel, NOT plain values. Maps must include the value indices the cards `.reduce()` over (bmsMode [2]+[3], balancing [1], charging [0]).
- `window.fetch` interceptor — the Rules page is REST-backed; intercepts `GET /rules/{clientId}` (returns 8 rules) and `GET /datatypes` (Add-Rule autocomplete). Restored on `stop()`.
- `NotificationLogService.addNotification` — seeds 3 past rule firings so the Rules stream rail + nav bell aren't empty.
**Data tuning (so everything renders green/healthy):**
- Cells 3.93–3.97 V (>3.5 = green tile, ≥3.6 = full-green heatmap; 40 mV delta = well balanced). SOC 82. Pack ≈ 513 V.
- Cell temps 22–27 °C: under the 35 °C heatmap-green threshold AND not pegged on the charging page's hard-coded −15..30 °C thermometer.
- All fault topics `0` (empty fault list). eFuses enabled/unfaulted, thermal rails in AUTO.
- Rule `expr` uses backend evalexpr syntax (value bound to `a`, e.g. `a > 55`); `debounce_time` is in SECONDS (see scylla-server/src/rule_structs.rs).
- CCL 45 / DCL 250 kept identical on BMS and Charging pages (same labels, no cross-screen contradiction).
**Notes / gotchas:**
- Default-on via `ENABLED_BY_DEFAULT`; disable with `localStorage.setItem('USE_SEED_DATA', 'false')` + reload.
- **The app is ZONELESS** (`provideExperimentalZonelessChangeDetection` in `main.ts`). The seed must NOT call `ApplicationRef.tick()`: a manual tick runs before the signal scheduler marks the OnPush widgets dirty, so it skips them (the BMS at-a-glance bar and segment overview render blank). Instead the seed just writes to Storage (exactly like the live `socket.service.ts` path) and lets the app's own CD drivers render it:
  - Signal readers — `toSignal` (bms-at-a-glance), the `statConfigs` signal (segment-overview), and the heatmap's `effect()` — re-render through the signal graph.
  - Field readers that set plain component fields (eFuse/charging status cards, current display, msgs/sec) are swept by the app-wide CD that the nav-bar clock's `time$ | async` schedules every second.
- Publishing is spread across a ~2.6s window after load/navigation (plain Subjects don't replay, so late-mounting widgets need a publish after they subscribe), then a 1s interval keeps values fresh. Status-card timers are emitted only a few times (not every interval) so their wall-clock "current" duration stays stable.
- **Charging-page graphs (Pack Voltage / Cell Voltage / Cell Temp) are time series.** Each display pushes `{ x: +value.time, y }` per emission, so `value.time` MUST be epoch-ms (`String(Date.now())`), matching the live socket path — an ISO string makes `+value.time` NaN and nothing plots. They build a line one point per emission, so the seed backfills a short ease-out charging ramp (`publishChargingGraphHistory`, ~60 pts ending exactly on the live anchor). That backfill runs ONCE per visit at the TOP of `publishAll` (flag `chargingGraphSeeded`, reset on navigating away): it must precede that tick's live points, or a live point landing first makes the series jump back in time and render as a diagonal "second line" (ApexCharts draws points in array order). Keep the ramp monotonic + noise-free — a per-point wiggle, once rounded (temp at 0.1 °C), becomes a zigzag that reads as a forked line.
- Console on the target screens is clean apart from expected `socket.io ERR_CONNECTION_REFUSED` retries (no backend in seed mode).
**Screenshots:** `pictures/seed-data-frontend/` — `charging-desktop` (now with populated graphs), `charging-mobile`, `bms-accumulator-desktop`, `bms-accumulator-cells-selected` (+ `bms-cells-selected-detail`; two cells selected → Cell Comparison panel), `bms-segment-view-desktop`, `efuses-desktop`, `rules-desktop`.
