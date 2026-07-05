# Planning pipeline

The default way to plan a feature: grill on a branch, review the plan, then create the tickets — as reviewable git history and GitHub issues, not an ephemeral chat session. Decision and rationale: ADR 0003.

## When to use it

Most of the time — any grill-with-docs or to-prd session for planning a feature. Skip only for trivial changes that need no planning session.

## Hierarchy

- **Planning ticket** — the idea/question. Entry point; names the branch.
- **PRD** — the plan, published as an issue that links up to the planning ticket. Parent of the implementation tickets.
- **Implementation tickets** — tracer-bullet slices; each has Parent = the PRD, not the planning ticket.

Only the PRD links to the planning ticket; everything else hangs off the PRD.

## Phases

Each phase is its own PR against develop, on a branch reused per phase (recreate {issue}-{kebab-title} off develop after each merge). "Under X" means the PR references issue X.

1. **PRD — PR under the planning ticket.** Run grill-with-docs (CONTEXT.md + ADR edits) and to-prd (PRD saved to docs/planning/<ticket>/prd.md). Review the plan in the draft PR. Once it's approved and merged, publish the PRD as an issue (to-prd) linked to the planning ticket.

2. **Issues — PR under the PRD.** Draft the implementation tickets as local files under docs/planning/<ticket>/tickets/ with to-issues. Review them in the draft PR. Once merged, create the child issues (to-issues) with Parent = the PRD.

3. **Cleanup — PR under the PRD.** Delete the temporary planning files (PRD + issue drafts); the PRD issue and its child issues are now the durable home.

Creating the issues is a manual skill step at each phase (to-prd for the PRD issue, to-issues for the children) — there is no merge automation, and the planning ticket is not reopened.

## Where artifacts live

| Artifact | Location | Lifetime |
| --- | --- | --- |
| PRD + ticket drafts | docs/planning/<ticket>/ (prd.md + tickets/) | temporary (deleted in phase 3) |
| ADRs | docs/adr/ (see domain.md for the naming convention) | persist |
| Glossary updates | CONTEXT.md (root) | persist |

<ticket> is the planning ticket's number and kebab-title (the same string as the branch name), e.g. docs/planning/668-build-planning-pipeline/.

The planning files are temporary — they exist so the plan and the drafted tickets are reviewable in the diff, and are deleted in phase 3 once the PRD issue and child issues exist on the tracker. The ADRs and CONTEXT.md edits are real docs and persist.

## Conventions

- **Branch:** {issue}-{kebab-title}, recreated off develop for each phase — no separate namespace.
- **PR:** draft, against develop, per the repo PR convention.
- **ai-workflow label:** marks tickets whose subject is the AI dev workflow itself, distinct from the product area labels. See issue-tracker.md for the palette.

See glossary.md for planning ticket, planning pipeline, PRD, and the triage roles.
