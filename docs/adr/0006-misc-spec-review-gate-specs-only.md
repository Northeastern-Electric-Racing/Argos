# Scope the spec/plan review gate to specs only; create implementation tickets directly

Argos narrows the spec/plan review gate introduced in [ADR-0005](0005-misc-wayfinder-and-spec-review.md) so it covers **specs only**. Implementation tickets from `to-tickets` are no longer staged as files and reviewed via a PR before publishing; they are created directly on the issue tracker after the skill's interactive quiz, then reviewed and refined as issues — the same treatment wayfinder investigation tickets already get. This also drops the epic-parent minting `to-tickets` had briefly gained (#700): a ticket links to its spec via `Parent` only when a spec exists, otherwise it stands alone, wired to its blockers by `Blocked by`.

## Considered Options

- Keep the gate over both specs and ticket sets (the ADR-0005 shape). Rejected — staging every tracer-bullet slice as a file, opening a review PR, merging, then a follow-up PR to delete the drafts is heavy ceremony for lightweight issues that are already editable on the tracker, and it diverges from Matt Pocock's adopted flow.
- Drop the gate entirely. Rejected — a spec is where a feature's direction is decided and is worth reviewing as a diff before the team commits to it.
- Gate specs only; create tickets directly (chosen).

## Why this shape

- **Only the spec is a decision artifact worth a diff review.** Ticket slicing is downstream and comparatively mechanical; it is already reviewed interactively in the `to-tickets` quiz and stays reviewable on the tracker.
- **It matches the adopted source flow.** Matt Pocock's `to-issues` / `to-tickets` files tickets directly with `gh issue create`; the file-staging gate was an Argos addition. His core ticket shape is `What to build` / `Acceptance criteria` / `Blocked by` — a flat dependency graph, not an epic hierarchy.
- **No invented parents.** A `Parent` link means "the spec that motivated these tickets." With no spec there is no parent to link, so tickets stand alone; minting a hollow epic just to have a parent (as #700 did) contradicts the flat `Blocked by` model.
- **Precedent already existed.** ADR-0005 already exempted wayfinder investigation tickets from the gate, reviewing them on the tracker. This extends that treatment to implementation tickets.

## Consequences

- `docs/agents/spec-review.md` is rewritten to a spec-only gate and retitled "Spec review"; `docs/spec/<name>/` now stages only `spec.md`. `to-spec` owns removing `spec.md` in its follow-up PR once the spec issue exists.
- `to-tickets` loses its file-staging step, its review-PR step, its follow-up-delete step, and the #700 epic-mint step; it creates tickets directly on the tracker in dependency order, setting `Parent` only when a spec exists.
- `CLAUDE.md` and `docs/agents/glossary.md` rename "Spec/plan review" to "Spec review" and note that tickets are created directly.
- ADR-0005 is amended with a pointer here; its spec gating and everything else stand.

See `docs/adr/0005-misc-wayfinder-and-spec-review.md`, `docs/agents/spec-review.md`, and `docs/agents/issue-tracker.md`.
