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

## Agent skills

Agent skills live in the Delphi `argos-dev` workspace (`commit`, `open-pr`, `update-pr`, `run-local`, `address-pr-comments`, `verify-telemetry`, `verify-graph`, `journal`, `log-future-addition`). Matt Pocock's skills were removed for now; ADRs 0002–0006 record their earlier adoption.

### Issue tracker

Issues live in GitHub Issues on `Northeastern-Electric-Racing/Argos` via the `gh` CLI. See `docs/agents/issue-tracker.md` for ticket types, labels, and conventions.

When an out-of-scope but worthwhile idea for the app comes up mid-work, offer to log it as an idea or spike instead of letting it slip (the `log-future-addition` and `journal` skills live in the Delphi `argos-dev` workspace).

### ADRs

Architecture decisions live in `docs/adr/`.
