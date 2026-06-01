# Argos — Claude Code Instructions

Argos is a real-time telemetry platform for Northeastern Electric Racing (NER). Angular 19 frontend (`angular-client/`) and Rust backend (`scylla-server/`), with schema tooling in `charybdis/` and MQTT broker config in `siren-base/`.

## Local Development

- The backend stack (Postgres, MQTT, Scylla server, Calypso simulator) runs in Docker via the compose files in `compose/`, driven by `argos.sh`.
- Pick the compose profile by what changed:
  - Frontend-only changes: `./argos.sh client-dev up` runs everything in Docker, including scylla-server.
  - Changes to `scylla-server/`: `./argos.sh scylla-dev up` (everything except scylla-server) plus `cd scylla-server && cargo run` in a separate terminal, so you are not testing a stale binary.
- Frontend client: `cd angular-client && npm run start` (default port 4200). The first Angular compile takes 60-90s.
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

Workflow skills (commit, open-pr, update-pr, address-pr-comments, run-local, verify-telemetry, verify-graph) and Matt Pocock's engineering and issue-authoring skills live in `.claude/skills/`. The AI issue-authoring flow is `grill-with-docs → to-prd → to-issues → triage`. See `docs/adr/0002-misc-adopt-matt-pocock-skills.md`.

### Issue tracker

Issues live in GitHub Issues on `Northeastern-Electric-Racing/Argos` via the `gh` CLI. See `docs/agents/issue-tracker.md` for title, label, and assignment conventions.

### Triage labels

Five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), created via `gh label create` and applied by `/triage`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and one `docs/adr/` at the repo root. Component-scoped decisions live in the same root `docs/adr/`, distinguished by descriptive titles. See `docs/agents/domain.md`, and `docs/agents/glossary.md` for workflow terminology.
