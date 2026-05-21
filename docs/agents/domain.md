# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

Argos uses a **single-context** layout: one `CONTEXT.md` and one `docs/adr/` at the repo root, covering the whole telemetry pipeline (`angular-client`, `scylla-server`, `siren-base`, `charybdis`). The components share a common vocabulary (telemetry shape, runs, datatypes, nodes), so a single glossary is authoritative. Component-scoped decisions live in the same root `docs/adr/`, distinguished by descriptive titles (e.g. `0014-angular-routing-strategy.md`, `0023-mosquitto-acl-pinning.md`).

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/adr/`** — read ADRs whose titles touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-...md
│   └── 0002-...md
├── angular-client/
├── scylla-server/
├── siren-base/
└── charybdis/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids. If a term is flagged as ambiguous (e.g. "Node" — which could mean Angular tree-node, CAN-bus node, or MQTT client), qualify it.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (...) — but worth reopening because…_
