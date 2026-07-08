# Rename to-prd → to-spec and to-issues → to-tickets, refreshed from upstream

Argos renames its two AI issue-authoring skills to track Matt Pocock's upstream renames and folds in the upstream content improvements, while preserving Argos-specific customizations. `to-prd` becomes `to-spec`; `to-issues` becomes `to-tickets`. The AI issue-authoring flow is now `grill-with-docs → to-spec → to-tickets → triage`. This amends [ADR-0002](0002-misc-adopt-matt-pocock-skills.md); the two-path rationale (humans author via GitHub form templates, AI authors via Matt's body shapes) is unchanged.

## Considered Options

- Rename only, keep the customized skill bodies as-is.
- Rename plus selectively adopt only the non-conflicting upstream additions.
- Rename plus fold in the full upstream content (chosen).

## Why rename and fold

- Upstream renamed the skills so "spec" is the single through-line term (`to-spec` still opens "you may know this document as a PRD" for discoverability), and merged `to-plan` + `to-issues` into one `to-tickets`. Keeping the old names left our copies as stale forks diverging from a source we still pull from.
- The upstream content carries real improvements worth having: the **wide-refactor / expand–contract** sequence for a mechanical change whose blast radius breaks vertical slicing; a **prefactoring** step ("make the change easy, then make the easy change"); single-fresh-context-window slice sizing; and `disable-model-invocation: true` so these user-invoked flow skills don't fire autonomously.
- `to-spec` adopts upstream's **seam** framing for step 2 (test at the highest, fewest seams) in place of our earlier deep-module framing. Deep-module vocabulary now lives with `codebase-design` upstream; this keeps `to-spec` focused on where tests go.

## Consequences

- `.claude/skills/to-prd/` → `.claude/skills/to-spec/`; `.claude/skills/to-issues/` → `.claude/skills/to-tickets/` (directory, frontmatter `name`, and `description` all updated).
- Argos customizations are preserved through the fold: both skills keep pointing at `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md` rather than upstream's `/setup-matt-pocock-skills` (which Argos does not vendor); `to-tickets` keeps the **HITL / AFK** slice classification in its rules and quiz; and `to-tickets` publishes only to Argos's GitHub Issues tracker, dropping upstream's tracker-agnostic local-file (`tickets.md`) path.
- `to-tickets` ends on the "work the frontier one ticket at a time" note without upstream's hard `/implement` reference, since Argos has not yet vendored the `implement` skill.
- References updated in `CLAUDE.md` (flow string), `docs/agents/glossary.md` (Tracer-bullet, Spec/PRD, Idea entries), `docs/agents/issue-tracker.md` (body-shape ownership line), and `.claude/skills/log-future-addition/SKILL.md` (three pointers).
- ADR-0002 gains an amendment banner pointing here; its body keeps the historical `to-prd` / `to-issues` names.

See `docs/adr/0002-misc-adopt-matt-pocock-skills.md`, `docs/agents/issue-tracker.md`, `docs/agents/glossary.md`.
