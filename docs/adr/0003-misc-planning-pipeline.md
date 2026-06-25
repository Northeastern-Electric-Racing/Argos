# Branch-based planning pipeline for AI-authored issues

The AI issue-authoring flow (grill-with-docs to-prd to-issues triage) produces its research, terminology decisions, ADRs, and PRD inside one ephemeral chat session, then files implementation issues directly from chat with no review gate. Argos moves that flow onto a branch: a planning ticket opens the work, the grilling session's artifacts (CONTEXT.md edits, ADRs, PRD) are committed to a branch tied to that ticket, and the branch is reviewed as a draft PR against develop before any implementation issues are spawned. Implementation issues are broken out after merge. A new ai-workflow label marks tickets whose subject is the AI dev workflow itself.

## Considered Options

- Keep the chat-only flow: file implementation issues directly from the planning session. Rejected — no durable, reviewable record of the reasoning, and issues spawn before anyone reviews the plan.
- Commit the artifacts but skip the planning ticket and PR review gate. Rejected — it keeps the artifacts but loses the review step, which is the whole point.
- Name it the "research pipeline." Rejected — the flow is more than research; it covers terminology, ADRs, and PRD authoring through to issue breakout.

## Why branch-based

- Planning artifacts become reviewable git history. The PRD and any ADRs land in a PR diff teammates can comment on before the work fans out into issues.
- A planning ticket gives the branch a tracked entry point, consistent with the existing {issue}-{kebab-title} branch convention — no new branch namespace to learn.
- Decoupling issue creation from the chat session is what makes stage-4 automation possible later: implementation issues can be generated from the merged PRD, keyed off its committed file path.
- The ai-workflow label gives meta-work (changes to the skills and docs/agents themselves) a first-class category, instead of mis-filing it under a product area label.

## Consequences

- PRDs and planning notes live in docs/planning/<ticket>/; ADRs still go in docs/adr/, and CONTEXT.md stays at the repo root.
- to-prd gains a pipeline mode: write the PRD to docs/planning/<ticket>/ and commit it on the branch, rather than only filing an issue from chat. Standalone mode (no planning branch) still publishes to the tracker.
- grill-with-docs's CONTEXT.md and ADR edits are committed to the planning branch and reviewed in the draft PR.
- Stage 4 (auto-create implementation issues on merge) is not built here — to-issues is still run manually after merge. Tracked as a follow-up.
- The ai-workflow label must exist in the tracker, created via gh label create; it is documented in docs/agents/issue-tracker.md.

See docs/agents/planning-pipeline.md for the operative stages and conventions.
