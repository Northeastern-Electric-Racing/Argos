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

These apply when an AI skill files an issue with `gh issue create`. They govern the title, labels, body length, and assignment only. The body *shape* (which sections exist and how they are structured) is owned by the authoring skill (`to-issues`, `to-prd`), not by this file. See glossary.md for ADR, triage, AFK, and the other workflow terms.

**Title:** concise, imperative mood (e.g. "Add pagination to the run list", "Fix redirect loop on login"). Do not prefix with `[Area] -`, even though the YAML form templates suggest it; real issues in this repo do not use that prefix.

**Labels:** apply at least one area label, plus a type and difficulty label where they fit. Choose from the existing palette:

| Group | Labels |
| --- | --- |
| Area | `angular-client`, `scylla-server`, `DevOps` |
| Type | `bug`, `new feature`, `feature enhancement`, `good first issue`, `epic` |
| Difficulty | `straightforward`, `medium`, `difficult` |
| Workflow | `ai-workflow` |

Apply `ai-workflow` when the ticket's subject is the AI dev workflow itself — the skills, docs/agents, or the issue pipeline — rather than product code. It is orthogonal to the area labels (a ticket is about the workflow or about a product component, not both). Created via `gh label create`, like the triage roles.

The triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) are applied by `/triage`, not at creation time. See triage-labels.md.

## Planning tickets

Whenever you plan a feature with grill-with-docs or to-prd, do it through the branch-based planning pipeline: the session runs on a branch off develop, its artifacts are committed and reviewed as a draft PR, and implementation issues are broken out after merge — not filed straight from chat or committed to develop. This is the normal path, not a special case. See planning-pipeline.md.

**Backticks:** at most three backtick usages in the entire issue body. Reference files, functions, and identifiers in plain text; reserve backticks for commands worth copy-pasting or short snippets.

**Assignment:** pass `--assignee @me` by default. This repo self-assigns issues.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
