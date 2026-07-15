# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `Northeastern-Electric-Racing/Argos`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## Argos ticket conventions

These apply when an AI skill files an issue with `gh issue create`. They govern the title, labels, body length, and assignment only. The body *shape* (which sections exist and how they are structured) is owned by the authoring skill (`to-tickets`, `to-spec`), not by this file. See glossary.md for ADR, triage, AFK, and the other workflow terms.

**Title:** concise, imperative mood (e.g. "Add pagination to the run list", "Fix redirect loop on login"). Do not prefix with `[Area] -`, even though the YAML form templates suggest it; real issues in this repo do not use that prefix.

**Labels:** apply at least one area label, plus a type and difficulty label where they fit. Choose from the existing palette:

| Group | Labels |
| --- | --- |
| Area | `angular-client`, `scylla-server`, `DevOps` |
| Type | `bug`, `new feature`, `feature enhancement`, `good first issue`, `epic` |
| Difficulty | `straightforward`, `medium`, `difficult` |
| Workflow | `ai-workflow` (the subject is the AI dev workflow itself, orthogonal to area) |

Wayfinder uses its own label namespace, created with `gh label create`: `wayfinder:map` for the map issue and `wayfinder:research` / `wayfinder:prototype` / `wayfinder:grilling` / `wayfinder:task` for its child tickets (see the Wayfinding operations section).

The triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) are applied by `/triage`, not at creation time (see triage-labels.md) — with one exception: the `log-future-addition` skill files a raw idea directly with `needs-triage`, placing it straight in the triage queue (a type or area is added only where clear, area not required; see glossary.md).

**Backticks:** at most three backtick usages in the entire issue body. Reference files, functions, and identifiers in plain text; reserve backticks for commands worth copy-pasting or short snippets.

**Assignment:** pass `--assignee @me` by default. This repo self-assigns issues.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Destination / Notes / Decisions-so-far / fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research` / `prototype` / `grilling` / `task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies** — the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/Northeastern-Electric-Racing/Argos/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/Northeastern-Electric-Racing/Argos/issues/<n> --jq .id` — *not* the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only — the live gate). Where dependencies aren't available on the repo, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me` — the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
