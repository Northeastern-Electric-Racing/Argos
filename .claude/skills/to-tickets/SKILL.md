---
name: to-tickets
description: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the project issue tracker. Use when the user wants to convert a plan into issues, create implementation tickets, or break down work into issues.
disable-model-invocation: true
---

# To Tickets

Break a plan, spec, or conversation into a set of **tickets** — tracer-bullet vertical slices, each declaring the tickets that **block** it.

Issue tracker conventions live in `docs/agents/issue-tracker.md`; the triage label vocabulary lives in `docs/agents/triage-labels.md`.

A ticket set is a **review artifact** — it is drafted as files and reviewed as a PR before the tickets publish. This is the gate that keeps unreviewed tickets off the tracker. See `docs/agents/spec-review.md`.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes a reference (a spec path, an issue number or URL) as an argument, fetch it and read its full body and comments.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Ticket titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

Look for opportunities to prefactor the code to make the implementation easier. "Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the work into **tracer bullet** tickets.

Slices may be **HITL** or **AFK**. HITL slices require human interaction, such as an architectural decision or a design review. AFK slices can be implemented and merged without human interaction. Prefer AFK over HITL where possible.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests) — vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Prefer many thin slices over few thick ones
- Any prefactoring should be done first

</vertical-slice-rules>

Give each ticket its **blocking edges** — the other tickets that must complete before it can start. A ticket with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change — rename a column, retype a shared symbol — whose **blast radius** fans across the whole codebase, so a single edit breaks thousands of call sites at once and no vertical slice can land green. Don't force it into a tracer bullet; sequence it as **expand–contract**. First expand: add the new form beside the old so nothing breaks. Then migrate the call sites over in batches sized by blast radius (per package, per directory), each batch its own ticket blocked by the expand, keeping CI green batch to batch because the old form still exists. Finally contract: delete the old form once no caller remains, in a ticket blocked by every migrate batch. When even the batches can't stay green alone, keep the sequence but let them share an integration branch that all block a final integrate-and-verify ticket — green is promised only there.

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each ticket, show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other tickets (if any) must complete first
- **What it delivers**: the end-to-end behaviour this ticket makes work

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct — does each ticket only depend on tickets that genuinely gate it?
- Should any tickets be merged or split further?
- Are the correct slices marked HITL and AFK?

Iterate until the user approves the breakdown.

### 5. Stage the tickets for review

Draft the approved tickets as local files under `docs/spec/<name>/` — one kebab-named file per ticket, using the issue-body template below — and open them as a PR against `develop` (draft per the repo convention, marked ready when set). This is the review gate (`docs/agents/spec-review.md`): the slicing is reviewed as a diff before any issue exists.

### 6. Publish once the review PR merges

After the PR is approved and merged, create the tickets on the issue tracker (GitHub Issues — see `docs/agents/issue-tracker.md`), one issue per ticket in dependency order (blockers first) so each ticket's blocking edges can reference real issue identifiers. Use GitHub's native sub-issue / blocking relationship where it fits; otherwise set each ticket's "Blocked by" to the blocking issues. Set each ticket's `Parent` to the spec issue. Apply the `ready-for-agent` triage label unless instructed otherwise — the tickets are agent-grabbable by construction.

The temporary `docs/spec/<name>/` drafts are now on protected `develop`, so removing them needs its own commit: open a **small follow-up PR against `develop`** that deletes the folder once the tracker issues exist. The tracker issues are the durable home.

Do NOT close or modify any parent issue.

<issue-template>

## Parent

A reference to the parent issue on the issue tracker (if the source was an existing issue, otherwise omit this section).

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective — not layer-by-layer implementation.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- A reference to each blocking ticket, or "None — can start immediately".

</issue-template>

Avoid specific file paths or code snippets — they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

Work the frontier one ticket at a time, clearing context between tickets.
