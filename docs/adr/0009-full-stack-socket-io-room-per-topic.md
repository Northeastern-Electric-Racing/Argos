# Deliver each topic through its own Socket.IO room

scylla-server sends the live `data` event for a topic only to clients that asked for it, over the Socket.IO connection they already have. Each topic is a room. A client names the full list of topics it reads, in the connect handshake (auth payload `{"topics": [...]}`) or later with the `set_subscriptions` event (an array of topic names, acked with `{"count": n}`), and scylla moves its socket into exactly those rooms. A client that never names any, such as an old Angular build or the Flutter app, sits in one every-topic room (`#`) and gets every topic, as before. Once a client has named a list, even an empty one, it is never in the every-topic room again. `metadata`, `faults`, `timers` and rule notifications still go to every socket.

## Considered Options

- Keep broadcasting every topic to every client. Rejected: each client gets every topic (about 900 of them under the simulator) and drops most of them, and scylla serializes every message even when no screen shows it.
- A per-socket topic index in scylla, emitting to each interested socket. Rejected: it rebuilds the membership bookkeeping socketioxide's rooms already do.
- Browsers subscribe to the MQTT broker directly, or through a NATS side-car. Rejected: live data would lose the runId that scylla stamps on it, the socket would still be needed for metadata, history and rules, and exposing the broker to browsers needs authentication and ACLs first.
- One room per topic, with the every-topic room as the default (chosen).

## Why this shape

- **Old clients keep working.** A socket stays on the every-topic room until it names topics, so each screen can move over on its own and mixed fleets get correct data.
- **Unwatched topics cost nothing.** scylla mirrors which rooms have sockets, and skips a topic nobody reads before serializing it. socketioxide creates a room on its first join and removes it on its last leave, so incoming data never creates one.
- **The full list every time.** socketioxide has no connection-state recovery, so a client must re-send its topics on every connect anyway. Sending the whole list (and replacing, not patching) leaves nothing to drift; scylla still only joins and leaves the rooms that changed.
- **Topics in the handshake** let a client that knows its page's topics skip the every-topic flood between connecting and its first `set_subscriptions`.

## Consequences

- socketioxide's local adapter does not dedupe a socket that is in two of an emit's rooms, so a socket is never in the every-topic room and a topic room at once. Its one move out of the every-topic room happens while no `data` emit is in flight, so no emit sees it in both rooms or in neither.
- Topic names are exact: names with MQTT wildcards (`#`, `+`) and empty names are dropped, so `#` can't collide with a topic room.
- The Angular client sends its topics (#994). Rooms live only in scylla's memory, so a scylla restart drops them and clients re-send on reconnect.
- With `--no-metadata`, scylla still broadcasts every topic to every client.
