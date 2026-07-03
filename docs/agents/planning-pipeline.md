# Planning pipeline

The default way to plan a feature with grill-with-docs or to-prd: do it on a branch, not in chat or straight on develop, so its artifacts (CONTEXT.md edits, ADRs, the PRD) are saved, reviewed, and testable before anything lands on develop. Decision and rationale: ADR 0003.

## When to use it

Most of the time — any grill-with-docs or to-prd session for planning a feature. Skip only for trivial changes that need no planning session.

## Stages

1. **Planning ticket.** A lightweight ticket stating what's being researched or triaged — the question, not the answer. It's the entry point and names the branch. Title it as a normal imperative with no special prefix (e.g. "Build grill-with-docs into a planning pipeline"), the same as any other ticket. Apply the ai-workflow label if its subject is the AI dev workflow itself (the skills, docs/agents, the issue pipeline); otherwise label by product area.

2. **Planning session on a branch.** Branch from develop as {issue}-{kebab-title}; run grill-with-docs (and to-prd) against the ticket. Commit every artifact to the branch:
   - CONTEXT.md edits at the repo root (glossary).
   - New ADRs in docs/adr/.
   - The PRD in docs/planning/<ticket>/prd.md, plus any planning notes in the same folder.

3. **Push + review.** Push and open a draft PR against develop; reference the planning ticket in the PR body with "Closes #<planning-ticket>" so merging the reviewed plan closes it automatically. Humans review the artifacts in the diff before any issues are broken out.

4. **Merge to implementation issues.** On merge, break the PRD into tracer-bullet issues with to-issues, setting each issue's Parent to the planning ticket so they link back to it (the merge closes that ticket, but a closed issue is still a valid Parent reference). Manual after merge today; auto-creation on merge is a planned follow-up (keyed off the committed PRD path).

## Where artifacts live

| Artifact | Location |
| --- | --- |
| PRD + planning notes | docs/planning/<ticket>/ |
| ADRs | docs/adr/ (see domain.md for the naming convention) |
| Glossary updates | CONTEXT.md (root) |

<ticket> is the planning ticket's number and kebab-title (the same string as the branch name), e.g. docs/planning/668-build-planning-pipeline/. The branch is deleted on merge, but the folder persists.

Planning artifacts are retained in-repo as durable history; they are not pruned after issues are created (stage-4 automation keys off the committed PRD path).

## Conventions

- **Branch:** {issue}-{kebab-title}, same as feature branches — no separate namespace.
- **PR:** draft, against develop, per the repo PR convention.
- **ai-workflow label:** marks tickets whose subject is the AI dev workflow itself, distinct from the product area labels. See issue-tracker.md for the palette.

See glossary.md for planning ticket, planning pipeline, PRD, and the triage roles.
