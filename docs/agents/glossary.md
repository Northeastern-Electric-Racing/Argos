# Workflow glossary

Plain-language definitions of the workflow and agent-tooling terms used across the skills and the other `docs/agents/` files. This is distinct from the domain glossary in CONTEXT.md, which defines telemetry concepts (DataType, Run, Node, ...). Where a term names a triage role or a doc artifact, the authoritative mechanics live in the file noted alongside it.

**ADR (Architecture Decision Record).** A short doc in docs/adr/ recording an architecture choice and why it was picked over the alternatives. ADR 0001 is the format reference. See domain.md for the naming convention.

**Triage.** Sorting a new issue into its next step by applying a label: needs-triage (not yet evaluated), needs-info (waiting on the reporter), ready-for-agent (well-defined enough for an AI agent to grab), ready-for-human (needs human judgment), wontfix (will not be actioned). Driven by the `/triage` skill. See triage-labels.md.

**HITL (Human In The Loop).** Work that needs a person making decisions; it cannot run unattended.

**AFK (Away From Keyboard).** Work an AI agent can finish on its own without supervision. The ready-for-agent label marks an issue as AFK-ready.

**Tracer-bullet issue / vertical slice.** A scoping pattern where each ticket cuts a thin slice through every layer it touches (database, API, UI, tests) end-to-end, instead of completing one layer at a time. Each slice stands on its own. The `to-tickets` skill breaks plans into these.

**Spec (PRD).** A feature spec — you may also know this document as a PRD (Product Requirements Document). The `to-spec` skill writes one; `to-tickets` then breaks it into tracer-bullet tickets.

**Spec review.** The *process* a spec passes through, not an artifact itself: a spec (`to-spec`) is staged as a file and reviewed as a PR before it publishes as an issue. Implementation tickets (`to-tickets`) are created directly on the tracker after the skill's quiz — not gated as files — so only a spec passes through this gate. Not a planning flow, and not attached to grilling or wayfinder. See spec-review.md.

**Idea.** A raw, un-fleshed feature or bug scrap filed as a single needs-triage ticket before anyone has classified it — the lightweight counterpart to a spec. Filed by the `log-future-addition` skill for `/triage` to classify like any other intake. Deliberately thin; anything already thought through belongs in `to-spec` or `grill-with-docs`.

**Journal.** A local, gitignored `.journal/` folder at the repo root for parking rough thoughts mid-task with zero ceremony. Managed by the `journal` skill, which has two halves: capture (local, formless, git-free) and export (an opt-in dispatcher that routes a ripe note to the skill owning its permanent home). The journal captures and routes only — it never reimplements formatting or ticketing and never contacts GitHub itself.

**entry (journal entry).** A single note file in the journal. Lives either loose at the journal root or inside a category. On export, one entry can be split across several destinations.

**category.** A subfolder under `.journal/` that clusters related entries. On export, a category's entries can be merged into one coherent output.

**Wayfinder map.** For an effort too big for one session, a single `wayfinder:map` issue that charts the way to a **destination** as a set of **investigation tickets** (child issues) resolved one at a time. Produced and worked by the `/wayfinder` skill — the authoritative source for the wayfinder terms below; it merges onto the main flow at `to-spec` (one map can feed several specs).

**Destination.** What a wayfinder map is finding its way to — a spec, a locked decision, or an in-place change. Named first; it fixes the map's scope.

**Frontier.** On a wayfinder map, the open, unblocked, unclaimed tickets — the takeable edge of the known. Everything past it is **fog of war**: decisions you can see coming but can't yet phrase sharply, recorded in the map's "Not yet specified" section until a resolution graduates them into tickets.

**Investigation ticket.** A wayfinder child issue that resolves one decision, of type `research` / `prototype` / `grilling` / `task`. Distinct from a tracer-bullet *implementation* ticket, which builds code; an investigation ticket produces a decision.

**ai-workflow.** A label marking issues whose subject is the AI dev workflow itself (skills, `docs/agents/`), orthogonal to the area labels.
