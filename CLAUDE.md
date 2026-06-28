# Argos — Claude Code Instructions

Argos is a real-time telemetry platform for Northeastern Electric Racing (NER). Angular 19 frontend (`angular-client/`) and Rust backend (`scylla-server/`), with schema tooling in `charybdis/` and MQTT broker config in `siren-base/`.

## Communication

Respond in `caveman` terse mode by default — a repo-wide pilot. Drop articles, filler, and pleasantries; keep full technical accuracy, exact code, and exact error text. See the `caveman` skill in `.claude/skills/caveman/` for the ruleset and the auto-clarity exceptions — security warnings, irreversible-action confirmations, and order-sensitive multi-step sequences stay in plain prose. Turn it off for a session with "stop caveman" or "normal mode".

## Local Development

- The backend stack (Postgres, MQTT, Scylla server, Calypso simulator) runs in Docker via the compose files in `compose/`, driven by `argos.sh`.
- Pick the compose profile by what changed:
  - Frontend-only changes: `./argos.sh client-dev up` runs everything in Docker, including scylla-server.
  - Changes to `scylla-server/`: `./argos.sh scylla-dev up` (everything except scylla-server) plus `cd scylla-server && cargo run` in a separate terminal, so you are not testing a stale binary.
- Frontend client: prefer the `run-local` skill (starts it on the next free port and checks the backend). Direct: `cd angular-client && npm run start` (default port 4200); first compile takes ~10-60s.
- The shell workflow (`argos.sh`, the `run-local`/`verify-*` skills, and helpers like `lsof`/`pkill`) assumes a Unix shell. On Windows, run everything from WSL or Git Bash, not `cmd`/PowerShell.

## Testing

- Frontend: `cd angular-client && ng test` (Karma/Jasmine).
- Backend: `cd scylla-server && cargo test`.
- Lint and format (frontend): `npx prettier --check "src/**/*.{ts,html,scss}" && npx ng lint`.
- Build (backend): `cargo build`.

## Branch & Commit Conventions

- Branch from `develop` (not `main`) unless told otherwise. Branch name format: `{issue-number}-{kebab-case-title}` (e.g. `533-csv-upload-download-rules`).
- Commit message format: `#{ticket-number} - {concise description}` (e.g. `#533 - add CSV upload endpoint`). The `/commit` skill applies this.

## PR Convention

- Open PRs against `develop` as drafts. The `/open-pr` skill runs the pre-PR checks (lint, conflict check), pushes, and opens the draft; `/update-pr` refreshes the description.
- Keep PR descriptions tight: at most three backtick usages in the body, and never commit screenshots (drag-drop them into the PR via the GitHub web UI).

## Screenshots

Save all Playwright screenshots under `pictures/<branch-name>/` at the repo root, using kebab-case descriptive filenames. The `pictures/` folder is git-ignored, so screenshots are never committed; drag-drop them into the PR via the GitHub web UI instead.

## Safety Rules

- Never modify `.env` or secret files without explicit confirmation.
- Never delete files without explicit confirmation.
- Explain reasoning before making architectural changes.

## Code Conventions

Frontend and backend conventions live alongside their code and auto-load when editing there:
- Angular / TypeScript: see `angular-client/CLAUDE.md`.
- Rust / Axum: see `scylla-server/CLAUDE.md`.

## Agent skills

Workflow skills (commit, open-pr, update-pr, address-pr-comments, run-local, verify-telemetry, verify-graph) and Matt Pocock's engineering and issue-authoring skills live in `.claude/skills/`. The AI issue-authoring flow starts with `grill-with-docs` and proceeds `grill-with-docs → to-prd → to-issues → triage` — always open with the grilling session, don't jump straight to drafting issues. See `docs/adr/0002-misc-adopt-matt-pocock-skills.md`. By default, plan features through the branch-based planning pipeline: run `grill-with-docs`/`to-prd` on a branch off develop, never on develop itself, so their artifacts are saved, committed, and reviewed before issues spawn. If a planning session starts while you are on develop, create the planning branch first. See `docs/agents/planning-pipeline.md` (ADR 0003). The `caveman` terse mode is on by default in this repo as a pilot — see the Communication section above.

### Issue tracker

Issues live in GitHub Issues on `Northeastern-Electric-Racing/Argos` via the `gh` CLI. See `docs/agents/issue-tracker.md` for title, label, and assignment conventions.

### Triage labels

Five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), created via `gh label create` and applied by `/triage`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and one `docs/adr/` at the repo root. Component-scoped decisions live in the same root `docs/adr/`, distinguished by descriptive titles. See `docs/agents/domain.md`, and `docs/agents/glossary.md` for workflow terminology.
