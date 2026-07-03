# PRD: Branch-based planning pipeline

Planning ticket: #668. This PRD is the prototype instance of the pipeline it describes — it was committed to this branch and reviewed before any implementation issues were broken out.

## Problem Statement

As a maintainer running the AI issue-authoring flow (grill-with-docs to-prd to-issues triage), I do all the research, terminology work, and PRD drafting inside one chat session and then file implementation issues straight from that chat. Nobody reviews the plan or the decisions before issues spawn, and the reasoning evaporates with the conversation — it never becomes durable, reviewable git history. Separately, a ticket whose subject is the AI dev workflow itself has no category; it gets mis-filed under a product area label.

## Solution

Move the planning flow onto a branch gated by PR review, in three phased PRs. A planning ticket opens the work and names the branch. Phase 1 (PR under the planning ticket): grill-with-docs commits its persistent artifacts — CONTEXT.md edits and ADRs — and to-prd stages the PRD as a temporary file; after review and merge the PRD is published as an epic issue linked to the planning ticket. Phase 2 (PR under the PRD): to-issues drafts the implementation tickets as local files; after merge they're created as children of the epic. Phase 3 (PR under the PRD): delete the temporary files. Issue creation is manual at each phase — no merge automation, no reopening the planning ticket. A new ai-workflow label marks tickets about the workflow itself.

## User Stories

1. As a maintainer, I want a planning ticket that states the open question, so that the branch and PR have a tracked entry point.
2. As a maintainer, I want the planning session's CONTEXT.md and ADR edits committed to the branch, so that the reasoning is durable git history instead of chat.
3. As a maintainer, I want the PRD written to docs/planning/<ticket>/ and committed, so that it is reviewable in the PR diff.
4. As a reviewer, I want the research, terminology, ADRs, and PRD in one draft PR, so that I can comment before any implementation issues exist.
5. As a maintainer, I want implementation issues broken out only after the PRD merges, so that issues never get ahead of the reviewed plan.
6. As a maintainer, I want the PRD published as an epic that parents the implementation tickets, and only the epic linking to the planning ticket, so that the hierarchy is one clean tree.
7. As a maintainer, I want an ai-workflow label, so that changes to the skills and docs/agents are a recognized category, not mis-filed under product areas.
8. As a contributor, I want the pipeline documented in docs/agents, so that I can follow it without reverse-engineering it from skills.

## Implementation Decisions

- Hierarchy: planning ticket → PRD (an epic issue that links to the planning ticket) → implementation tickets (Parent = the PRD). Only the PRD links to the planning ticket.
- The PRD's home is a GitHub epic issue. It's staged as a temporary file in docs/planning/<ticket>/ only for PR review, then published as the epic and the files deleted in phase 3. ADRs (docs/adr/) and CONTEXT.md edits persist.
- Three phases, each its own PR on a branch reused off develop: PRD (under the planning ticket), issue drafts (under the PRD), cleanup (under the PRD).
- Issue creation is manual at each phase (to-prd publishes the epic, to-issues the children). No merge automation, no reopening the planning ticket.
- Branch naming reuses the existing {issue}-{kebab-title} convention — no new namespace.
- to-prd gains a pipeline mode (stage the PRD file for review); to-issues drafts the sub-tickets as local files with Parent = the PRD. grill-with-docs's edits are committed to the branch and reviewed in the PR.
- ai-workflow is a workflow-group label, orthogonal to area labels, created via gh label create.
- The decision is recorded in ADR 0003 (misc-planning-pipeline); operative mechanics live in docs/agents/planning-pipeline.md.
- The flow is named "planning pipeline," not "research pipeline" — it spans terminology, ADRs, and PRD authoring, not just research.

## Testing Decisions

This slice is documentation and skill guidance — no automated tests. Verification is by review: the pipeline page, ADR, label-palette entry, and skill edits are read in the PR, and this PRD's own presence on the branch demonstrates the structure end-to-end.

## Out of Scope

- Merge automation. Issue creation stays a manual skill step at each phase; no GitHub Action or merge hook creates issues, and the planning ticket is never reopened. This was considered and deliberately rejected, not deferred.

## Further Notes

The pipeline is the default for planning a feature with grill-with-docs or to-prd, not a special case for big tickets; the ai-workflow label is an orthogonal marker for the subset whose subject is the workflow itself.
