# Architecture diagrams

`argos-architecture.drawio` — three pages, open with [app.diagrams.net](https://app.diagrams.net)
or the Draw.io VS Code extension.

| Page | Covers |
| ---- | ------ |
| 1 · System Architecture | End-to-end picture: CAN nodes → Calypso → Siren → scylla-server → Postgres and the clients, plus the command return path, offline back-fill, Grafana's Zenoh bypass, and Charybdis. |
| 2 · scylla-server internals | The ingest pipeline stage by stage — transports, decode/stamp, broadcast fan-out, the two consumers, channel capacities, and the cross-cutting concerns. |
| 3 · API & deployment reference | Every REST route, the Socket.IO events, the database schema, key environment variables, and what each compose profile brings up. |

Keep it in step with the code when transports, routes, or compose profiles change —
the pages state a date in their subtitle, so bump that too.
