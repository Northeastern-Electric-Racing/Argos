---
name: journal
description: Capture rough notes locally with zero ceremony, then export them to their right permanent home. Use when the user wants to jot/park/stash a thought mid-task without derailing ("note to self", "remember to", "journal this"), or when they later want to export/file/route parked notes into an issue, spec, ADR, CONTEXT term, or docs. Capture is local and gitignored; export delegates to whichever existing skill owns the note's permanent home.
---

# Journal

Two clearly-separated halves:

- **Capture** — local, formless, git-free. A note drops into a gitignored `.journal/` folder. Zero ceremony, nothing to push.
- **Export** — a deliberate, opt-in dispatcher. When a note is ripe, propose the best-fit destination and hand it off to whichever existing skill already owns that kind of output.

The journal **captures and routes only**. It never reimplements formatting, ticketing, branching, or PRs, and never pushes or contacts GitHub itself — every outward action is owned by the export flow the user chose.

Terms `Journal`, `entry`, and `category` are defined in `docs/agents/glossary.md`.

## Storage

- `.journal/` at the repo root, **gitignored** (kept separate from `.context/`, which holds cloned reference repos).
- **Categories** are subfolders that cluster related entries; **entries** are note files.
- **Loose** entries at the journal root are fine — capture stays frictionless.

## Capture

Run the helper — it creates `.journal/` if needed and writes a timestamped entry:

```
.claude/skills/journal/scripts/capture.sh -c <category> "note text"
```

Omit `-c` for a loose root entry; omit the text to create an empty entry to hand-edit. Capture **never** invokes git, GitHub, or any downstream skill — just write the file and report where it landed.

## Export

The dispatcher. Work through these steps in order:

1. **Read** the `.journal/` layout and the content of the entries.
2. **Propose grouping** — for each note or cluster, one of:
   - *standalone* — one entry → one output.
   - *merge (many-to-one)* — a category's entries combine into one coherent output.
   - *split (one-to-many)* — a single entry holding distinct notes fans out to several destinations.
   Show the proposal; let the user adjust. Do not hand-sort silently.
3. **Pick the flow** for each output (flow-picker below).
4. **Select the destination**, biasing hard toward an existing docs area/section. A brand-new section is a last resort and is **always surfaced for approval**.
5. **Confirm gate (unconditional).** Show the destination and the reshaped text, then wait for approval before anything is created — existing area or not. Nothing lands silently.
6. **Delegate** to the chosen skill. Never reimplement its formatting, conventions, ticketing, or GitHub contact.
7. **Cleanup prompt.** After a successful export, ask whether to delete the source entry. **Default is keep.**

### Flow-picker

Match the note to the skill that owns its permanent home, then delegate. Each skill's own description is the source of truth for what it produces and the conventions it follows — read it there, don't restate it here.

| Note is… | Delegate to |
|---|---|
| a rough, out-of-scope idea | `log-future-addition` |
| a set of work items / a plan to break down | `to-tickets` |
| a fleshed-out feature or spec | `to-spec` |
| a decision or a new term | `grill-with-docs` |
| research / preserved thinking | `research` |

The journal only routes; the delegated skill owns formatting, ticketing, and any GitHub contact. Conventions live in their standard places — issue/label rules in `docs/agents/issue-tracker.md`, term definitions in `docs/agents/glossary.md`. Do not duplicate them here.

## Guardrails

- Capture touches nothing but the filesystem under `.journal/`.
- The journal never pushes, opens PRs, or contacts GitHub on its own.
- Never create anything on export without passing the confirm gate first.
- Prefer an existing docs area over a new one; surface any new section for approval.
