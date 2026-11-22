# Deliver each topic through its own Socket.IO room

scylla-server sends the live `data` event for a topic only to clients that asked for it, over the Socket.IO connection they already have. Each topic is a room. A client that reads topics connects with `subscriptions=1` in its query string, which puts its socket in no room, and names the full list of topics it reads with the `set_subscriptions` event (`{"seq": n, "topics": [...]}`, acked with `{"count", "seq"}` of the list it ended on); scylla moves its socket into exactly those rooms. A client without the flag, such as an old Angular build or the Flutter app, sits in one every-topic room (`#`) for its whole connection and gets every topic, as before; scylla ignores its `set_subscriptions`. `metadata`, `faults` and `timers` still go to every socket.

## Considered Options

- Keep broadcasting every topic to every client. Rejected: each client gets every topic (about 900 of them under the simulator) and drops most of them, and scylla serializes every message even when no screen shows it.
- A per-socket topic index in scylla, emitting to each interested socket. Rejected: it rebuilds the membership bookkeeping socketioxide's rooms already do.
- Browsers subscribe to the MQTT broker directly, or through a NATS side-car. Rejected: live data would lose the runId that scylla stamps on it, the socket would still be needed for metadata, history and rules, and exposing the broker to browsers needs authentication and ACLs first.
- One room per topic, with the every-topic room as the default (chosen).

## Why this shape

- **Old clients keep working.** A socket without the flag stays on the every-topic room, so each client can move over on its own and mixed fleets get correct data.
- **Unwatched topics cost nothing.** scylla mirrors which rooms have sockets, and skips a topic nobody reads before serializing it. socketioxide creates a room on its first join and removes it on its last leave, so incoming data never creates one.
- **The full list every time.** socketioxide has no connection-state recovery, so a client must re-send its topics on every connect anyway. Sending the whole list (and replacing, not patching) leaves nothing to drift; scylla still only joins and leaves the rooms that changed.
- **Numbered lists, latest wins.** socketioxide handles each event in its own task, so two lists sent close together can be applied in either order. Each list carries a number the client raises every time, and scylla applies a list only if its number is higher than the last one it applied to that socket (a new socket starts at 0). A client can so change its topics as often as it likes and always ends on its latest list, without sending patches that would have to apply in order.
- **A flag at connect, the list in an event.** The flag settles at connect whether a socket gets every topic or only its lists, so a socket never moves out of the every-topic room; such a move would make every emit wait for it, so that none sees the socket in both rooms or in neither. The list itself can't go in the query string (a page's ~750 topics are ~20 KB, past what proxies accept in a URL), and the Socket.IO auth payload is meant for credentials.

## Consequences

- socketioxide's local adapter does not dedupe a socket that is in two of an emit's rooms; a socket is never in the every-topic room and a topic room at once, since the flag decides between them at connect.
- A client gets no `data` until its first list is applied, one round trip after connecting. scylla registers `set_subscriptions` in connect middleware, which socketioxide awaits before it acks the connection, so a list sent as soon as the client is acked is never dropped. Clippy warns on every event handler registration not marked as made from middleware (`clippy.toml`), so new ones get the same check.
- Topic names are exact: names with MQTT wildcards (`#`, `+`) and empty names are dropped, so `#` can't collide with a topic room.
- The Angular client sends its topics (#994). Rooms live only in scylla's memory, so a scylla restart drops them and clients re-send on reconnect.
- With `--no-metadata`, scylla still broadcasts every topic to every client.
