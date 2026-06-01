# Adopt Matt Pocock's agent skills for AI-driven issue authoring

Argos adopts Matt Pocock's `grill-with-docs → to-prd → to-issues → triage` skill flow as the AI-driven path for issue authoring and triage. The legacy `create-ticket` and `brainstorm-ticket` skills retire. Humans continue to author issues via Argos's GitHub form templates (`task.yml`, `bug-form.yml`, `feature-request.yml`, `epic.yml`); AI authors via Matt's baked-in body shapes filed through `gh issue create --body`. The `ready-for-agent` triage label distinguishes AI-filed issues.

## Considered Options

Drop YAML templates entirely; humans and AI both file via Matt's shapes.

## Why two-path

- Matt's skill set decomposes the `create-ticket` monolith into composable steps (explore, draft PRD, break into vertical slices, triage). Skills can be invoked individually as the work demands instead of being routed through one entrypoint.
- AI body shape belongs to the AI flow. Matt's body templates live inside `to-issues` and `to-prd` SKILL.md files; the GitHub form templates live in `.github/ISSUE_TEMPLATE/`. Two independent sources of truth, one per actor; neither imposes its shape on the other.
- Keeping `.github/ISSUE_TEMPLATE/` preserves the rollback path. If Matt's flow doesn't pan out, the human ticketing experience is unchanged and we don't have to rebuild the templates from scratch.
- `gh issue create --body` bypasses GitHub form templates at the API layer. Forcing AI output into the YAML sections was considered and rejected as lossy (e.g., Matt's `Implementation Decisions` and `Testing Decisions` have no slot in `epic.yml`).

## Consequences

- `.claude/skills/create-ticket/` and `.claude/skills/brainstorm-ticket/` are removed from `.claude/skills/`.
- `.github/ISSUE_TEMPLATE/spike.yml` and `other.yml` are removed; the surviving four templates are `task.yml`, `bug-form.yml`, `feature-request.yml`, `epic.yml`.
- `docs/agents/issue-tracker.md` ports the Argos ticketing conventions from `create-ticket`: title rules (concise, imperative, no `[Area] -` prefix), label palette (area + type + difficulty), backtick rule (max 3 per body), `--assignee @me` default.
- Triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) are created via `gh label create` and coexist with existing area / type / difficulty labels.
- Memory entries `reference_ticket_context.md` and `reference_ticket_conventions.md` are updated to reference the new flow.
- Issue-review experience diverges by source: human-authored issues use familiar YAML form fields; AI-authored issues use Matt's shape (`What to build` / `Acceptance criteria` / `Blocked by` for `to-issues`; full PRD template for `to-prd`). Reviewers need familiarity with both.

See `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/domain.md`.
