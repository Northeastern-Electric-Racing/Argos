# Planning pipeline

The default way to plan a feature with grill-with-docs or to-prd. Instead of doing that work in an ephemeral chat — or committing it straight to develop — you do it on a branch, so the artifacts it produces (CONTEXT.md edits, ADRs, the PRD) are saved, recorded, reviewed, and testable before anything lands on develop. Decision and rationale: ADR 0003.

## When to use it

Most of the time. Any session that runs grill-with-docs or to-prd to plan a feature goes through the pipeline — that is just what it means to plan on a branch rather than in chat. Skip it only for trivial, well-understood changes that need no planning session at all.

## Stages

1. **Planning ticket.** A human files a lightweight ticket describing what is being researched or triaged — the question, not the answer. This is the entry point and the thing the branch is named for. If the ticket's subject is the AI dev workflow itself (the skills, docs/agents, the issue pipeline), apply the ai-workflow label; otherwise label it by the product area being planned.

2. **Planning session on a branch.** Branch from develop as {issue}-{kebab-title}. Run grill-with-docs (and to-prd) against the ticket. Every artifact the session produces is committed to that branch:
   - CONTEXT.md edits at the repo root (glossary).
   - New ADRs in docs/adr/.
   - The PRD in docs/planning/<ticket>/prd.md, plus any planning notes in the same folder.

3. **Push + review.** Push the branch and open a draft PR against develop. Humans review the research, terminology, ADRs, and PRD in the diff before any implementation work is broken out.

4. **Merge to implementation issues.** Once the PR merges, the PRD is broken into tracer-bullet issues with to-issues, linked back to the planning ticket. Today this is run manually after merge; auto-creating the issues on merge is a planned follow-up (keyed off the committed PRD path).

## Where artifacts live

| Artifact | Location |
| --- | --- |
| PRD + planning notes | docs/planning/<ticket>/ |
| ADRs | docs/adr/ (see domain.md for the naming convention) |
| Glossary updates | CONTEXT.md (root) |

<ticket> is the kebab-case branch name, e.g. docs/planning/668-build-planning-pipeline/.

## Conventions

- **Branch:** {issue}-{kebab-title}, same as feature branches — no separate namespace.
- **PR:** draft, against develop, per the repo PR convention.
- **ai-workflow label:** marks tickets whose subject is the AI dev workflow itself, distinct from the product area labels. See issue-tracker.md for the palette.

See glossary.md for planning ticket, planning pipeline, PRD, and the triage roles.
