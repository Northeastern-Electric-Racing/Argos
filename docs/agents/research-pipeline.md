# Research pipeline

How AI-authored work moves from an open question to implementation issues as reviewable git history, instead of an ephemeral chat session. Decision and rationale: ADR 0003.

## When to use it

Reach for the pipeline when the work needs research, terminology decisions, or an architecture call before implementation — the kind of session that runs grill-with-docs and to-prd. Small, well-understood tickets don't need it; file them and go.

## Stages

1. **Research ticket.** A human files a lightweight ticket describing what is being researched or triaged — the question, not the answer. This is the entry point and the thing the branch is named for. If the ticket's subject is the AI dev workflow itself (the skills, docs/agents, the issue pipeline), apply the ai-workflow label; otherwise label it by the product area being researched.

2. **Grilling session on a branch.** Branch from develop as {issue}-{kebab-title}. Run grill-with-docs (and to-prd) against the ticket. Every artifact the session produces is committed to that branch:
   - CONTEXT.md edits at the repo root (glossary).
   - New ADRs in docs/adr/.
   - The PRD in docs/research/<ticket>/prd.md, plus any grilling notes in the same folder.

3. **Push + review.** Push the branch and open a draft PR against develop. Humans review the research, terminology, ADRs, and PRD in the diff before any implementation work is broken out.

4. **Merge to implementation issues.** Once the PR merges, the PRD is broken into tracer-bullet issues with to-issues, linked back to the research ticket. Today this is run manually after merge; auto-creating the issues on merge is a planned follow-up (keyed off the committed PRD path).

## Where artifacts live

| Artifact | Location |
| --- | --- |
| PRD + grilling notes | docs/research/<ticket>/ |
| ADRs | docs/adr/ (see domain.md for the naming convention) |
| Glossary updates | CONTEXT.md (root) |

<ticket> is the kebab-case branch name, e.g. docs/research/668-build-research-pipeline/.

## Conventions

- **Branch:** {issue}-{kebab-title}, same as feature branches — no separate namespace.
- **PR:** draft, against develop, per the repo PR convention.
- **ai-workflow label:** marks tickets whose subject is the AI dev workflow itself, distinct from the product area labels. See issue-tracker.md for the palette.

See glossary.md for research ticket, research pipeline, PRD, and the triage roles.
