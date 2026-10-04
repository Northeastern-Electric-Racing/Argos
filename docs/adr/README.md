# Architecture Decision Records

One ADR per decision, numbered in order. ADR 0001 is the format reference.

## Naming

Filename shape: `<NNNN>-<prefix>-<topic-slug>.md`. The prefix shows which component a decision touches:

| Prefix | Scope |
|---|---|
| `angular-client-` | frontend only |
| `scylla-server-` | backend only |
| `siren-base-` | MQTT broker config only |
| `charybdis-` | schema / codegen only |
| `full-stack-` | `scylla-server` + `angular-client` |
| `multi-comp-` | any other cross-component integration, plus repo-wide infrastructure (Docker compose, root scripts, CI) |
| `misc-` | decisions that don't touch a code component, e.g. docs structure or workflow conventions |

Quick test: would this decision change if we rewrote the production code in a different language or framework? If yes, use a component or integration prefix; if no, use `misc-`.
