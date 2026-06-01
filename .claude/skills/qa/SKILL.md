---
name: qa
description: Quick QA gate for the current branch — runs the build, then the logic (unit/integration) tests. Use before review or pushing to confirm things compile and tests pass. Pass `--no-logic` (or "build only") to run the build alone and skip the logic tests.
allowed-tools: Bash(git:*), Bash(cargo:*), Bash(npx ng:*), Bash(npm:*)
user-invocable: true
---

## Your task

Run the QA gate on the current branch and report pass/fail. Two stages: **build** always runs, **logic tests** run unless skipped.

**Flag:** if the args contain `--no-logic`, `build-only`, or "skip logic", run the build only and skip stage 2. Otherwise run both.

### 1. Scope

```bash
git diff --name-only $(git merge-base origin/develop HEAD)..HEAD
```

Run gates only for the stacks that changed — `scylla-server/` (backend), `angular-client/` (frontend), or both. If nothing obvious changed, run both.

### 2. Build

- Backend: `cd scylla-server && cargo build`
- Frontend: `cd angular-client && npx ng build`

If the build fails, report it and stop — there's no point running tests against code that doesn't compile.

### 3. Logic tests

*Skip this stage if the flag was set.*

- Backend: `cd scylla-server && cargo test`
- Frontend: `cd angular-client && npx ng test --watch=false`

### 4. Report

One line per gate run: build ✅/❌, logic tests ✅/❌ (or "skipped"). On any failure, include the relevant output tail. End with a one-line verdict.
