---
name: log-future-addition
description: File a single out-of-scope idea, feature, or improvement as one un-triaged GitHub issue. Use whenever the user raises something that would be a good future addition to the app but is out of scope for the current work ("we could also…", "would be nice to…", "let's do that later") — offer to log it. For a fleshed-out feature use to-prd; to break an existing plan into tickets use to-issues.
---

# Log Future Addition

Capture one rough, out-of-scope idea as a single un-triaged GitHub issue, so a good thought is not lost when it surfaces mid-work.

This is the lightweight counterpart to `to-prd`. Use it for a **brief, quick idea** — anything already thought through belongs in `to-prd` (a spec) or a `grill-with-docs` session. It is NOT for breaking down plans; that is `to-issues`.

Issue tracker conventions (title, labels, backticks, assignment) live in `docs/agents/issue-tracker.md`. The `Idea` term is defined in `docs/agents/glossary.md`. Do not duplicate those here — link and follow.

## When to reach for this skill

- An out-of-scope idea comes up in conversation and you want to keep it without derailing the current work.
- You have a one-line feature/bug/improvement scrap and just want it on the tracker.

If the input is really a plan or spec — multiple features, acceptance criteria, phased work, or simply long and detailed — say so and point the user to `to-prd` (one PRD issue) or `to-issues` (many tracer-bullet issues). Suggest, do not hard-refuse; the user can override.

## Two-stage consent

1. **Before running:** unless the user explicitly invoked this skill, first *ask* whether they want to log the idea (e.g. "Want me to log that as a future addition?"). Only proceed on a yes.
2. **Before posting:** always show the full drafted issue and get consent before calling `gh issue create`. Never file silently.

## Process

### 1. Gather the idea

Take the idea from, in order of preference:

1. The command argument, if one was passed (this is how another skill delegates a raw idea to this one).
2. The current conversation context.
3. A short interactive prompt, if neither of the above yields anything.

### 2. Check for duplicates

Run one lightweight, non-blocking search on the idea's keywords:

`gh issue list --search "<keywords>" --state open`

If a strong match turns up, surface it in the confirm step ("possible duplicate of #123 — file anyway?"). Never block filing on this.

### 3. Draft the issue

- **Title:** concise, imperative (per `issue-tracker.md`).
- **Body:** the minimal shape below — a raw idea, not a spec.
- **Labels:** see below.

<issue-template>
## What

One or two sentences describing the idea, in the user's own framing.

## Why

The motivation, or the scrap it came from. Omit this section entirely if there is nothing to add.

> *Logged as a raw idea via log-future-addition.*
</issue-template>

Keep to at most three backtick usages in the whole body (per `issue-tracker.md`).

### 4. Choose labels

- **`needs-triage`** — always. Files the idea straight into the triage queue as intake. This is the one place a triage role is applied at creation instead of by `/triage` (see `issue-tracker.md`).
- **Type** (`bug` / `new feature` / `feature enhancement`) — apply when the idea clearly is one; otherwise leave it for `/triage`.
- **Area** (`angular-client` / `scylla-server` / `DevOps`) — apply only when obvious; otherwise omit. A raw idea often is not scoped to an area yet, so area is not required.
- **Difficulty** — never. That is `/triage`'s call.

`/triage` then classifies it (category, area, difficulty) like any other needs-triage issue.

### 5. Confirm, then file

Show the drafted title, body, and labels. On consent, file it:

`gh issue create --title "..." --body "..." --assignee @me --label needs-triage[,<others>]`

Report the new issue number and URL. Do not triage it, and do not run any further work on it.
