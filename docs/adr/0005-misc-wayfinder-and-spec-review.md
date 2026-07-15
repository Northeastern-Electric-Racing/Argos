# Adopt wayfinder + implement, and reshape the planning pipeline into a spec/plan review requirement

> **Amended by [ADR-0006](0006-misc-spec-review-gate-specs-only.md).** The review gate described here as covering *two* artifact types — a spec and a plan/ticket set — was later narrowed to **specs only**. Implementation tickets (`to-tickets`) are now created directly on the tracker and reviewed there, like wayfinder investigation tickets. Read the plan/ticket-set gating below as superseded; the spec gating and everything else in this ADR stand.

Argos completes the Matt Pocock engineering-flow adoption. It takes his main flow as the spine — `grill-with-docs → to-spec → to-tickets → implement` — adds `wayfinder` as the exploration on-ramp and `research` as a delegated-reading skill, and reshapes the branch-based planning pipeline (proposed in #669) from a default multi-phase flow into a narrow **spec/plan review requirement**. This supersedes the planning-pipeline design; #669 is closed in its favour.

## Considered Options

- Make wayfinder the default spine ("wayfinder-first"). Rejected — Matt's own router keeps the grill-led `idea → ship` chain as the front door and treats wayfinder as a situational on-ramp; crowning it the spine was deferred upstream as a larger move.
- Keep #669's planning pipeline as the default way to plan a feature. Rejected — it conflates exploration (now `wayfinder`'s job) with the review gate, and frames a heavy three-phase ceremony as the default.
- Adopt the spine, wayfinder as on-ramp, and keep only the review gate from #669 (chosen).

## Why this shape

- **Wayfinder is an on-ramp, not the spine.** It plans an effort too big for one session as a map of *investigation* tickets that resolve to decisions, then merges onto the main flow at `to-spec`. One map can feed several specs. It produces decisions, not deliverables, and hands off — it does not build.
- **The path to implementation tickets is always `to-tickets`.** Whether an idea came through wayfinder or a plain grill, it consolidates at `to-spec` and slices at `to-tickets`. Two distinct things are called "ticket": wayfinder *investigation* tickets (decisions) and *implementation* tickets (tracer-bullet build slices).
- **The pipeline's real value was a review gate, and only that survives.** #669 existed to (a) let a plan be reviewed as git history before it fans into issues and (b) keep unreviewed tickets off the tracker. Wayfinder already reviews its investigation tickets continuously on the tracker, so the branch gate is redundant there. What remains is a requirement attached to two artifact types — a **spec** and a **plan/ticket set** — regardless of origin: stage as a file, review as a PR, publish only on merge. It is decoupled from grilling and wayfinder.
- **`code-review` is Matt's two-axis review.** Vendored under the name `code-review`, replacing the built-in one, so `/code-review` is the Standards-vs-Spec review (parallel sub-agents + a Fowler smell baseline). Its Standards axis reads Argos's `CLAUDE.md` convention files; its Spec axis reads the originating issue or a `docs/spec/` spec. `implement` runs it — and its commit step uses Argos's `/commit` convention, not a bare commit.

## Consequences

- New skills `.claude/skills/wayfinder/`, `.claude/skills/implement/`, `.claude/skills/code-review/`, and `.claude/skills/research/` (research adopted separately in #689). `implement` drives `tdd` → `code-review` → `commit`; it does not push or open PRs.
- `docs/agents/issue-tracker.md` gains a **Wayfinding operations** section (GitHub sub-issues, native issue dependencies with a body fallback, frontier query, claim, resolve), the `ai-workflow` workflow label, and the `wayfinder:map` / `wayfinder:<type>` label namespace.
- `docs/agents/spec-review.md` documents the review requirement; `to-spec` stages to `docs/spec/<name>/spec.md` and `to-tickets` drafts per-ticket files under `docs/spec/<name>/`, each opened as a PR before publishing. This restores a local-file draft mode that the #683 fold-in had dropped.
- Glossary gains wayfinder map / destination / frontier / investigation-ticket / spec-plan-review / ai-workflow terms; `CLAUDE.md` documents the main flow, the on-ramps, and the review gate.
- #669 (branch-based planning pipeline) is superseded and closed; its durable pieces — the `ai-workflow` label and the review-before-publish idea — live on here in reshaped form. #682 (`/start-ticket`) is closed as superseded: `implement` plus the `{issue}-{kebab-title}` branch convention cover it.

See `docs/adr/0002-misc-adopt-matt-pocock-skills.md` through `0004`, `docs/agents/spec-review.md`, and `docs/agents/issue-tracker.md`.
