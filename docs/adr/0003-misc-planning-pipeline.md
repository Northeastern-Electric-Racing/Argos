# Branch-based planning pipeline for AI-authored issues

The AI issue-authoring flow (grill-with-docs to-prd to-issues triage) produced its research, terminology, ADRs, and PRD inside one ephemeral chat session, then filed implementation issues from chat with no review gate. Argos moves that flow onto a branch: a planning ticket opens the work, the session's artifacts (CONTEXT.md edits, ADRs, PRD) are committed to the branch, and it's reviewed as a draft PR against develop before any issues spawn. Issues are broken out after merge. A new ai-workflow label marks tickets whose subject is the AI dev workflow itself.

## Considered Options

- Keep the chat-only flow: file implementation issues directly from the planning session. Rejected — no durable, reviewable record of the reasoning, and issues spawn before anyone reviews the plan.
- Commit the artifacts but skip the planning ticket and PR review gate. Rejected — it keeps the artifacts but loses the review step, which is the whole point.
- Name it the "research pipeline." Rejected — the flow is more than research; it covers terminology, ADRs, and PRD authoring through to issue breakout.

## Why branch-based

- Planning artifacts become reviewable git history. The PRD and any ADRs land in a PR diff teammates can comment on before the work fans out into issues.
- A planning ticket gives the branch a tracked entry point, consistent with the existing {issue}-{kebab-title} branch convention — no new branch namespace to learn.
- Reviewing the plan before it fans out means the tickets that get created reflect an approved PRD, not a chat draft nobody signed off on.
- The ai-workflow label gives meta-work (changes to the skills and docs/agents themselves) a first-class category, instead of mis-filing it under a product area label.

## Consequences

- Hierarchy: planning ticket → PRD (published as an issue that links to the planning ticket) → implementation tickets (Parent = the PRD). Only the PRD links to the planning ticket; the sub-tickets hang off the PRD.
- Three phases, each its own PR on a branch reused off develop: (1) PRD file, PR under the planning ticket; (2) implementation tickets drafted as local files, PR under the PRD; (3) delete the temporary files, PR under the PRD.
- Planning files (prd.md plus the ticket drafts under tickets/) in docs/planning/<ticket>/ are temporary — they exist for PR review and are deleted in phase 3, once the PRD issue and child issues exist. ADRs (docs/adr/) and CONTEXT.md edits are real docs and persist.
- to-prd gains a pipeline mode: stage the PRD as docs/planning/<ticket>/prd.md for review. to-issues drafts the sub-tickets as local files with Parent = the PRD. Standalone mode still publishes straight to the tracker.
- Issue creation is a manual skill step at each phase (to-prd publishes the PRD issue, to-issues the children). No merge automation, and the planning ticket is not reopened — phase 1 runs under the planning ticket, phases 2 and 3 under the PRD.
- The ai-workflow label is created via gh label create and documented in docs/agents/issue-tracker.md.

See docs/agents/planning-pipeline.md for the operative stages and conventions.
