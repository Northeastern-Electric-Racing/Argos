---
name: implement
description: Implement a piece of work based on a spec or set of tickets.
disable-model-invocation: true
---

Implement the work described by the user in the spec or ticket(s).

Work one ticket at a time, from a fresh context per ticket. If the ticket isn't on a branch yet, branch from `develop` as `{issue-number}-{kebab-title}` per the repo convention.

Use `/tdd` where possible, at pre-agreed seams.

Run checks as you go, not just at the end:

- **Frontend** (`angular-client/`): typecheck/build regularly. Run single Karma specs while iterating with `ng test --include='src/**/thing.spec.ts' --watch=false`, and the full suite once at the end with `ng test --watch=false` — bare `ng test` watches and blocks the shell. Then `npx prettier --check` + `npx ng lint` before finishing.
- **Backend** (`scylla-server/`): `cargo build` and single tests regularly, `cargo test` once at the end.

Once the behaviour is done, use `/code-review` to review the work.

Commit with `/commit` (applies the `#{ticket-number} - {description}` convention) to the ticket's branch. Do not push or open a PR unless asked — that's `/open-pr`.
