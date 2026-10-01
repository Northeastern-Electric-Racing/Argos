# Argos — Claude Code Instructions

Argos is a real-time telemetry platform for Northeastern Electric Racing (NER). Angular 19 frontend (`angular-client/`) and Rust backend (`scylla-server/`), with schema tooling in `charybdis/` and MQTT broker config in `siren-base/`.

## Local Development

- The backend stack (Postgres, MQTT, Scylla server, Calypso simulator) runs in Docker via the compose files in `compose/`, driven by `argos.sh`.
- Pick the compose profile by what changed:
  - Frontend-only changes: `./argos.sh client-dev up` runs everything in Docker, including scylla-server.
  - Changes to `scylla-server/`: `./argos.sh scylla-dev up` (everything except scylla-server) plus `cd scylla-server && cargo run` in a separate terminal, so you are not testing a stale binary.
- Frontend client: `cd angular-client && npm run start` (default port 4200); first compile takes ~10-60s.
- The shell workflow (`argos.sh` and helpers like `lsof`/`pkill`) assumes a Unix shell. On Windows, run everything from WSL or Git Bash, not `cmd`/PowerShell.

## Testing

- Frontend: `cd angular-client && ng test` (Karma/Jasmine).
- Backend: `cd scylla-server && cargo test`.
- Lint and format (frontend): `npx prettier --check "src/**/*.{ts,html,scss}" && npx ng lint`.
- Build (backend): `cargo build`.

## Branch & Commit Conventions

- Branch from `develop` (not `main`) unless told otherwise. Branch name format: `{issue-number}-{kebab-case-title}` (e.g. `533-csv-upload-download-rules`).
- Commit message format: `#{ticket-number} - {concise description}` (e.g. `#533 - add CSV upload endpoint`).

## PR Convention

- Open PRs against `develop` as drafts.
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

Matt Pocock's engineering and issue-authoring skills live in `.claude/skills/`. The workflow skills (`commit`, `open-pr`, `update-pr`, `run-local`, `address-pr-comments`, `verify-telemetry`, `verify-graph`) live in the Delphi `argos-dev` workspace.

The **main flow** (idea → ship): `grill-with-docs` sharpen the idea → `to-spec` write the spec → `to-tickets` slice it into tracer-bullet implementation tickets → `implement` per ticket (drives `tdd`, then `code-review`, then `commit`). A well-understood single feature can skip straight from grill to `to-spec`; a trivial one-liner goes straight to `implement`. `grill-with-docs` orchestrates the `grilling` and `domain-modeling` primitives.

**On-ramps** merge onto that flow: a huge, foggy effort too big for one session → `wayfinder`, which charts a map of investigation tickets on the tracker, then merges at `to-spec` (one map can feed several specs); raw incoming issues → `triage`.

**Spec review:** a spec (`to-spec`) is staged as a file and reviewed as a PR before it publishes to the tracker — see `docs/agents/spec-review.md`. Implementation tickets (`to-tickets`) and wayfinder investigation tickets are created directly on the tracker and reviewed there instead — they don't pass through this gate.

See `docs/adr/0002-misc-adopt-matt-pocock-skills.md`, `docs/adr/0003-misc-rename-to-spec-to-tickets.md`, `docs/adr/0004-misc-split-grill-with-docs.md`, `docs/adr/0005-misc-wayfinder-and-spec-review.md`, and `docs/adr/0006-misc-spec-review-gate-specs-only.md`.

### Issue tracker

Issues live in GitHub Issues on `Northeastern-Electric-Racing/Argos` via the `gh` CLI. See `docs/agents/issue-tracker.md` for title, label, and assignment conventions.

When an out-of-scope but worthwhile idea for the app comes up mid-work, offer to log it as a needs-triage issue instead of letting it slip (the `log-future-addition` and `journal` skills live in the Delphi `argos-dev` workspace).

### Triage labels

Five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), created via `gh label create` and applied by `/triage`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and one `docs/adr/` at the repo root. Component-scoped decisions live in the same root `docs/adr/`, distinguished by descriptive titles. See `docs/agents/domain.md`, and `docs/agents/glossary.md` for workflow terminology.
