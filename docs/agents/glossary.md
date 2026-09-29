# Workflow glossary

Plain-language definitions of the workflow terms used across the skills and `docs/agents/`. This is distinct from the domain glossary in CONTEXT.md, which defines telemetry concepts (DataType, Run, Node, ...).

**ADR (Architecture Decision Record).** A short doc in docs/adr/ recording an architecture choice and why it was picked over the alternatives. ADR 0001 is the format reference. See domain.md for the naming convention.

**Triage.** Sorting a new issue into its next step by applying a label: needs-triage (not yet evaluated), needs-info (waiting on the reporter), ready-for-agent (well-defined enough for an AI agent to grab), ready-for-human (needs human judgment), wontfix (will not be actioned). Applied by hand; see issue-tracker.md.

**Idea.** A raw, un-fleshed feature or bug scrap filed as a single needs-triage ticket before anyone has classified it. Filed by the `log-future-addition` skill and classified in triage like any other intake. Deliberately thin; anything already thought through belongs in a full issue.

**Journal.** A local, gitignored `.journal/` folder at the repo root for parking rough thoughts mid-task with zero ceremony. Managed by the `journal` skill, which has two halves: capture (local, formless, git-free) and export (an opt-in dispatcher that routes a ripe note to the skill owning its permanent home). The journal captures and routes only — it never reimplements formatting or ticketing and never contacts GitHub itself.

**entry (journal entry).** A single note file in the journal. Lives either loose at the journal root or inside a category. On export, one entry can be split across several destinations.

**category.** A subfolder under `.journal/` that clusters related entries. On export, a category's entries can be merged into one coherent output.

**ai-workflow.** A label marking issues whose subject is the AI dev workflow itself (skills, `docs/agents/`), orthogonal to the area labels.
