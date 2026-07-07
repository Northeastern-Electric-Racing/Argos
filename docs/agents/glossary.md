# Workflow glossary

Plain-language definitions of the workflow and agent-tooling terms used across the skills and the other `docs/agents/` files. This is distinct from the domain glossary in CONTEXT.md, which defines telemetry concepts (DataType, Run, Node, ...). Where a term names a triage role or a doc artifact, the authoritative mechanics live in the file noted alongside it.

**ADR (Architecture Decision Record).** A short doc in docs/adr/ recording an architecture choice and why it was picked over the alternatives. ADR 0001 is the format reference. See domain.md for the naming convention.

**Triage.** Sorting a new issue into its next step by applying a label: needs-triage (not yet evaluated), needs-info (waiting on the reporter), ready-for-agent (well-defined enough for an AI agent to grab), ready-for-human (needs human judgment), wontfix (will not be actioned). Driven by the `/triage` skill. See triage-labels.md.

**HITL (Human In The Loop).** Work that needs a person making decisions; it cannot run unattended.

**AFK (Away From Keyboard).** Work an AI agent can finish on its own without supervision. The ready-for-agent label marks an issue as AFK-ready.

**Tracer-bullet issue / vertical slice.** A scoping pattern where each ticket cuts a thin slice through every layer it touches (database, API, UI, tests) end-to-end, instead of completing one layer at a time. Each slice stands on its own. The `to-issues` skill breaks plans into these.

**PRD (Product Requirements Document).** A feature spec. The `to-prd` skill writes one; `to-issues` then breaks it into tracer-bullet tickets.

**Idea.** A raw, un-fleshed feature or bug scrap filed as a single needs-triage ticket before anyone has classified it — the lightweight counterpart to a PRD. Filed by the `log-future-addition` skill for `/triage` to classify like any other intake. Deliberately thin; anything already thought through belongs in `to-prd` or `grill-with-docs`.
