# Documentation architecture: single-context with component-prefixed ADRs

Argos uses a single root `CONTEXT.md` and a single root `docs/adr/`. ADRs are prefixed with a component tag (`angular-client-`, `scylla-server-`, `siren-base-`, `charybdis-`, `full-stack-`, `multi-comp-`, `misc-`) so component scoping is visible without splitting directories.

## Considered Options

Multi-context layout — per-component `CONTEXT.md` and `docs/adr/` indexed by a root `CONTEXT-MAP.md`.

## Why single-context

- The four components share one telemetry vocabulary (`DataType`, `Run`, `Node`, ...) with only syntax-level variation across TypeScript, Rust, and the schema. Per-component glossaries would be near-empty.
- The agent-skills `CONTEXT.md` doctrine is strictly glossary-only — framework conventions and implementation patterns don't belong there regardless of structure.
- Per-component ADR discovery in the agent-skills is gated on multi-context mode (presence of `CONTEXT-MAP.md`). All-or-nothing; no clean hybrid.
- Zero existing ADRs today. The root-pile ergonomics problem doesn't exist yet and may never reach the threshold.

## Consequences

If ADR count crosses a pain threshold (~20–30) and clusters cleanly by component, the flip to multi-context is a trivial `mv` — every filename already encodes its scope.

See `docs/agents/domain.md` for the operative reading/writing rules.
