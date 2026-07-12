# Split grill-with-docs into grilling + domain-modeling primitives

Argos decomposes the monolithic `grill-with-docs` skill into two reusable primitives, tracking Matt Pocock's upstream split. `grill-with-docs` becomes a thin orchestrator — "Run a `/grilling` session, using the `/domain-modeling` skill" — and its two halves move into standalone skills:

- **`grilling`** — the relentless interview primitive (walk the design tree, one question at a time, recommend an answer for each).
- **`domain-modeling`** — the active doc discipline (challenge terms against `CONTEXT.md`, sharpen fuzzy language, offer ADRs sparingly), carrying the `CONTEXT-FORMAT.md` and `ADR-FORMAT.md` bundled files.

## Considered Options

- Leave the monolith as-is.
- Patch the monolith in place (port the fixes without splitting).
- Adopt the upstream split (chosen).

## Why split

- The two halves are independently reusable. `improve-codebase-architecture` already leans on both the grilling conversation and the `CONTEXT.md` / ADR discipline; other skills can now invoke `grilling` or `domain-modeling` directly instead of duplicating the prose.
- The split let us fix a real regression the monolith carried. Our `grill-with-docs` still had the blanket line "if a question can be answered by exploring the codebase, explore the codebase instead" — the exact wording that lets a grilling agent answer its own **decisions** and race ahead. The new `grilling` splits **facts** (look them up) from **decisions** (put each to the human and wait), and adds a confirmation gate: do not enact the plan until the user confirms shared understanding.
- `disable-model-invocation: true` moves onto `grill-with-docs` (a user-invoked flow entry); `grilling` and `domain-modeling` stay model-invocable so the agent and other skills can reach them.

## Consequences

- New skills `.claude/skills/grilling/` and `.claude/skills/domain-modeling/`; `grill-with-docs/SKILL.md` shrinks to the orchestrator line.
- `CONTEXT-FORMAT.md` and `ADR-FORMAT.md` move from `grill-with-docs/` to `domain-modeling/`. The two links in `improve-codebase-architecture/SKILL.md` are repointed to `../domain-modeling/`, and its "same discipline as `/grill-with-docs`" note now points at `/domain-modeling`.
- The `grill-with-docs → to-spec → to-tickets → triage` flow named in `CLAUDE.md` and ADR-0002/0003 is unchanged — `grill-with-docs` still exists as the entry point, it just delegates.

See `docs/adr/0002-misc-adopt-matt-pocock-skills.md`, `docs/adr/0003-misc-rename-to-spec-to-tickets.md`.
