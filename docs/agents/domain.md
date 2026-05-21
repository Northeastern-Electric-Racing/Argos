# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

Argos uses a **multi-context** layout. Each top-level component is its own context: `angular-client/`, `scylla-server/`, `siren-base/`, `charybdis/`. System-wide decisions (cross-component protocols, deployment, telemetry shape) live at the repo root; context-specific decisions live next to the component they describe.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`<component>/CONTEXT.md`** — the glossary and invariants for the component you're touching.
- **`docs/adr/`** at the repo root — system-wide decisions.
- **`<component>/docs/adr/`** — context-scoped decisions for the component you're touching.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT-MAP.md                        ← index of per-component CONTEXT.md files
├── docs/adr/                             ← system-wide decisions (cross-component protocols, deploy, telemetry)
│   ├── 0001-...md
│   └── 0002-...md
├── angular-client/
│   ├── CONTEXT.md
│   └── docs/adr/                         ← frontend-specific decisions
├── scylla-server/
│   ├── CONTEXT.md
│   └── docs/adr/                         ← backend-specific decisions
├── siren-base/
│   ├── CONTEXT.md
│   └── docs/adr/                         ← ingestion / network-specific decisions
└── charybdis/
    ├── CONTEXT.md
    └── docs/adr/                         ← database-specific decisions
```

Shared infra (`compose/`, `utils/`, `argos.sh`, `router-up.sh`) is covered by the root `docs/adr/` since it cuts across components.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids. If a term means different things in two contexts (e.g. "node" in the network layer vs. the frontend), qualify it.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (...) — but worth reopening because…_

Check both the root `docs/adr/` and the component's own `docs/adr/` before claiming a decision is novel.
