---
name: qa
description: QA an implemented branch against its issue's acceptance criteria before review. Use when work is finished and you want a per-criterion pass/fail report — runs the test/lint/build gates, reuses verify-telemetry/verify-graph where the diff touches them, and maps each acceptance criterion to evidence. Does not approve or merge.
allowed-tools: Bash(git:*), Bash(gh pr:*), Bash(gh issue:*), Bash(cargo:*), Bash(npx prettier:*), Bash(npx ng:*)
user-invocable: true
---

## Your task

Check that the current branch actually delivers what its ticket asked for, and produce a QA report a human can act on. This skill **verifies and reports** — it never approves, merges, or replies on the PR.

Run each step in order. Stop and report if any step fails to run (a failing *check* is a finding, not a stop — record it and continue).

### 1. Identify the work under test

```bash
gh pr view --json number,title,headRefName,body
```

From the PR body, find the linked issue (`Closes #N` / `Fixes #N`). If there's no PR yet, fall back to the branch name (`{issue-number}-{title}`) to find the issue. If you can't resolve an issue number, ask the user for it — the acceptance criteria are the whole point.

### 2. Pull the acceptance criteria

```bash
gh issue view <N> --json title,body,labels
```

Extract the acceptance criteria — the checklist, "Definition of done", or the behavioral requirements in the body. If the issue has none, list the behaviors implied by the title and say so in the report (criteria were inferred, not stated).

### 3. Scope the change

```bash
git diff --stat $(git merge-base origin/develop HEAD)..HEAD
```

Note which areas the diff touches — `angular-client/`, `scylla-server/`, telemetry/MQTT, the graph page — so you know which checks and verify skills apply.

### 4. Run the mechanical gates

Run only those that apply to the changed areas:

- Backend (`scylla-server/` changed): `cd scylla-server && cargo test && cargo build`
- Frontend (`angular-client/` changed): `cd angular-client && npx ng test --watch=false && npx prettier --check "src/**/*.{ts,html,scss}" && npx ng lint`

Capture pass/fail and the relevant output tail for each.

### 5. Behavioral verification (reuse, don't duplicate)

- If the diff touches MQTT-displayed telemetry values → run the `verify-telemetry` skill.
- If the diff touches the graph page, its components, rendering, or mode logic → run the `verify-graph` skill.
- Otherwise, run the app via `run-local` and check the specific behavior the criteria describe.

Screenshots land in the git-ignored `pictures/<branch>/` per the root CLAUDE.md.

### 6. Report

Emit a per-criterion checklist. For each acceptance criterion: **pass / fail / can't-verify**, with one line of evidence (a test result, a screenshot path, a diff reference). Then list the gate results from step 4. End with a one-line verdict: ready for review, or blocked on the listed failures.

Do not approve, merge, or post to the PR. The human reads the report and decides.
