# Work out the shutdown loop status in scylla too, and publish it as datapoints and Faults

scylla-server works out the Shutdown Loop page's status itself, with the same algorithm as the angular-client, and publishes it as `Argos/Shutdown/*` datapoints through the same channels MQTT data takes: the socket channel (clients, Rules, the Fault list) and the database channel (stored with the current Run). Loop breaks, mismatches and CAN latch trips are raised as Faults on the `Vcu` or `Bms` Node. The page prefers scylla's node states while they are fresh and falls back to computing locally. Topics, codes and Fault names are in `docs/spec/shutdown-loop-page/spec.md` (Data). No database migration is needed.

## Considered Options

- **Frontend only** (the spec's first draft). Rejected: a trip seen by nobody is lost, there is no history to ask "why did the car shut down on lap 7?", and Rules can't watch the loop.
- **A REST endpoint or socket event for the status.** Rejected: neither is stored, so no history, and Rules only see datapoints.
- **A table in the argos database (ADR 0008).** Rejected: needs migrations and its own history queries, and Rules, the graph page and Grafana already work on datapoints. The status is a function of car data in a Run, float-valued, so it fits a datapoint.
- **Compute inside the socket handler, beside `Argos/Message_Rate`.** Rejected: that handler is off with `--no-metadata` and already large. A task of its own, like the track handler, publishes into the shared channels and stays testable.
- **Only the server computes; the client just displays.** Rejected: the page would go blank with an older scylla, a scylla without the task, or a slow link. Both compute; the client prefers the server's result.
- **One shared JSON loop definition read by both.** Rejected: each component builds in its own Docker context (`angular-client/`, `scylla-server/`), so a file outside one isn't there at build time. scylla keeps its own table (`shutdown_loop/model.rs`), and a `cargo test` reads the client's `shutdown-loop.model.ts` and `shutdown-page.topics.ts` and fails if the order, topics, boards or critical faults differ.

## Why this shape

- **History and Rules for free.** Stored datapoints carry the Run, so the graph page and Grafana show when and where the loop opened, and a Rule like `a == 0` on `Argos/Shutdown/Verdict` can notify the pit.
- **Same path as car data.** Publishing into the socket and database broadcasts means the socket handler, rule engine, track handler and batch upsert treat the status like any topic. The task ignores `Argos/Shutdown/*`, so it never reads its own output.
- **Faults through the existing Fault list.** scylla publishes `Argos/Shutdown/Fault/{Vcu|Bms}/{name}` as 1 every second while active and 0 once when it clears. The socket handler turns 1 into an occurrence (first occurrence, last seen) and 0 into expired, so the Fault ends when the loop closes, not when an unrelated message arrives. Breaks go on the board whose reading found them, mismatches on the board of the contradicting reading, CAN latch trips on `Vcu`.
- **Times are scylla's own.** Staleness and grace windows use when scylla received each message, never the car's clock, which can be off.
- **The client prefers the server only while it can trust it.** The server sees every message; a client may have some dropped by the socket discard setting. The client uses scylla's node states only if they arrived in the last 3 s and have one valid code per loop node; otherwise it computes locally.

## Consequences

- **Flagged conflict with ADR 0008.** ADR 0008 keeps the car database "car data only". `Argos/Shutdown/*` datapoints are computed by Argos but stored there, like `Argos/Message` already is. The argument for the car database: they are a function of one Run's car data, have no meaning outside it, and need to sit beside the readings for history, Grafana and Rules. If the team wants the line kept strict, the alternative is storing them in the argos database and losing Rules and the graph page.
- **Flagged glossary drift.** The glossary says synthetic topics are "never persisted" and that a Node is one of `Bms`, `Dti`, `Mpu`, `Charger`. `Argos/Message` already breaks the first. This decision persists `Argos/Shutdown/*` and adds `Vcu` as a Node, so `docs/CONTEXT.md` (the workspace doc) needs both entries updated. The shutdown page's `LoopNode` is a loop element, not a glossary Node; the spec now says "loop node".
- **Two copies of the algorithm.** `shutdown-loop.utils.ts` and `scylla-server/src/shutdown_loop/status.rs` must change together. The node table is checked by test. The algorithm isn't, so each side ports the other's unit tests.
- **Every loop opening is a Fault,** including turning TSMS off in the pits. That is the history the page exists for, but the Fault list gets busier. Filtering by loop-node kind (latches and interlocks only) is a small follow-up if it gets noisy.
- **Extra data.** About five datapoints a second plus one per active Fault per second, written by the existing batch upsert.
- **Fixed on the way:** the Fault list's gap check subtracted the wrong way (`last_seen - now`), so a Fault that came back after a long gap never started a new entry. It now does, and the old entry expires.
