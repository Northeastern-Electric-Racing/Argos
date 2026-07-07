---
name: start-ticket
description: Start work on an existing issue by branching correctly off the latest develop. Use when the user wants to grab, start, pick up, or begin implementing a GitHub issue and needs a conventionally-named branch. Setup only — it does not implement, commit, or open a PR.
allowed-tools: Bash(git:*), Bash(gh issue view:*)
user-invocable: true
---

# Start Ticket

Thin setup skill: fetch an issue, sanity-check it, and create a `{issue-number}-{kebab-title}` branch off the latest develop. Then stop — implementing, committing (`/commit`), and opening a PR (`/open-pr`) are owned elsewhere.

Issue-tracker conventions live in `docs/agents/issue-tracker.md`; the triage vocabulary lives in `docs/agents/triage-labels.md`. Branch and commit conventions live in the root `CLAUDE.md`.

## Process

### 1. Get the issue reference

Take the issue number or URL from the argument. If none was given, ask which issue to start.

### 2. Fetch and sanity-check

Read the issue (title, body, labels). Locally use `gh issue view <number>`; on Claude Code web use the `github` MCP tools (see issue-tracker.md).

**Warn — never hard-block. Let the user override any warning:**
- **State:** if the issue carries `needs-triage`, `needs-info`, or `wontfix`, or has no triage label at all, warn and suggest running `/triage` first. Triage roles: see triage-labels.md.
- **Labels:** note any missing area (`angular-client` / `scylla-server` / `DevOps`) or type (`bug`, `new feature`, …) label — see issue-tracker.md.
- **Title:** if the title is empty or too vague to make a sensible branch name, say so and propose one.
- **Epic:** if the issue is type `epic`, it's tracked by its child slices, not implemented directly. Warn and ask which child slice to start rather than branching the epic itself.

### 3. Derive the branch name

`{issue-number}-{kebab-title}` — kebab-case the issue title, concise (e.g. issue 533 "Add CSV upload/download rules" → `533-csv-upload-download-rules`). Trim filler; keep it recognizable.

### 4. Check for an existing branch — do not clobber

```bash
git branch --list "<number>-*"
git ls-remote --heads origin "<number>-*"
```
If a branch for this issue already exists (local or origin), offer to check it out instead of creating a duplicate. Do not overwrite it.

### 5. Warn on a dirty tree, then branch

`git checkout -B` carries uncommitted changes onto the new branch. If `git status --porcelain` is non-empty, list the dirty files and confirm before proceeding.

Base defaults to `origin/develop`. For a slice that depends on another unmerged slice, the user can pass that slice's branch as the base to stack on top of it — one issue still gets one branch and one PR; only the base changes.

```bash
git fetch origin <base>          # <base> defaults to develop
git checkout -B <name> origin/<base>
```

### 6. Confirm and stop

Report the issue (number + title), the branch created, and its base (`origin/develop`). Ready to implement — do not implement, commit, or open a PR.
