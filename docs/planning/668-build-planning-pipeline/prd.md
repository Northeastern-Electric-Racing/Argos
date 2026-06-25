# PRD: Branch-based planning pipeline

Planning ticket: #668. This PRD is the prototype instance of the pipeline it describes — it was committed to this branch and reviewed before any implementation issues were broken out.

## Problem Statement

As a maintainer running the AI issue-authoring flow (grill-with-docs to-prd to-issues triage), I do all the research, terminology work, and PRD drafting inside one chat session and then file implementation issues straight from that chat. Nobody reviews the plan or the decisions before issues spawn, and the reasoning evaporates with the conversation — it never becomes durable, reviewable git history. Separately, a ticket whose subject is the AI dev workflow itself has no category; it gets mis-filed under a product area label.

## Solution

Move the planning flow onto a branch gated by PR review. A planning ticket opens the work and names the branch. The planning session commits its artifacts — CONTEXT.md edits, ADRs, and the PRD — to that branch. The branch is pushed and reviewed as a draft PR against develop. Only after merge are implementation issues broken out. A new ai-workflow label marks tickets about the workflow itself.

## User Stories

1. As a maintainer, I want a planning ticket that states the open question, so that the branch and PR have a tracked entry point.
2. As a maintainer, I want the planning session's CONTEXT.md and ADR edits committed to the branch, so that the reasoning is durable git history instead of chat.
3. As a maintainer, I want the PRD written to docs/planning/<ticket>/ and committed, so that it is reviewable in the PR diff.
4. As a reviewer, I want the research, terminology, ADRs, and PRD in one draft PR, so that I can comment before any implementation issues exist.
5. As a maintainer, I want implementation issues broken out only after the PRD merges, so that issues never get ahead of the reviewed plan.
6. As a maintainer, I want an ai-workflow label, so that changes to the skills and docs/agents are a recognized category, not mis-filed under product areas.
7. As a contributor, I want the pipeline documented in docs/agents, so that I can follow it without reverse-engineering it from skills.

## Implementation Decisions

- Planning artifacts (PRD + notes) live in docs/planning/<ticket>/. ADRs stay in docs/adr/; CONTEXT.md stays at the root.
- Branch naming reuses the existing {issue}-{kebab-title} convention — no new namespace.
- to-prd gains a pipeline mode (commit PRD to the branch) alongside its existing standalone mode (file an issue).
- grill-with-docs documents that, in pipeline mode, its edits are committed to the branch and reviewed in the PR.
- ai-workflow is a workflow-group label, orthogonal to area labels, created via gh label create.
- The decision is recorded in ADR 0003 (misc-planning-pipeline); operative mechanics live in docs/agents/planning-pipeline.md.
- The flow is named "planning pipeline," not "research pipeline" — it spans terminology, ADRs, and PRD authoring, not just research.

## Testing Decisions

This slice is documentation and skill guidance — no automated tests. Verification is by review: the pipeline page, ADR, label-palette entry, and skill edits are read in the PR, and this PRD's own presence on the branch demonstrates the structure end-to-end.

## Out of Scope

- Stage 4 automation: auto-creating implementation issues on merge (a GitHub Action or merge hook running to-issues, keyed off the PRD path). Tracked as a separate follow-up PR. Until then, to-issues is run manually after merge.
- Creating the ai-workflow label in the tracker (run via gh label create when access allows).

## Further Notes

The pipeline is the default for planning a feature with grill-with-docs or to-prd, not a special case for big tickets; the ai-workflow label is an orthogonal marker for the subset whose subject is the workflow itself.
