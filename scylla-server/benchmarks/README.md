# Selective delivery benchmarks

Measures what delivering each topic through its own Socket.IO room (epic #991, ADR 0009, `src/socket_subscriptions.rs`) saves over develop's broadcast of every topic to every client, on the simulator's real topics.

| File | What it is |
|---|---|
| `selective_delivery.rs` | Server micro-benchmark: cost of each `data` emit, and of `set_subscriptions` changes, against in-process dummy sockets |
| `live.mjs` | Live end-to-end benchmark: N real Socket.IO clients against a running scylla-server, each with its own topic list |
| `run.sh` | Brings up an offset scylla-dev stack, runs `live.mjs` against this branch's server, then against develop's, and tears down |
| `sim-topics.txt` | The simulator's topics with their message counts in 20 s (1,048 topics, ~3,900 msgs/s), counted off its MQTT broker; the micro-benchmark replays it |

## Server micro-benchmark

```sh
cd scylla-server && cargo bench --bench selective_delivery
```

It replays the 20 s of traffic in `sim-topics.txt` (each topic's messages evenly spaced and interleaved) through two emit paths, with 1, 5 and 15 sockets:

- broadcast: `io.emit` of the serialized `ClientData` to every socket, which is what develop's `send_socket_msg` does;
- rooms: `Subscriptions::emit_data`, with every socket on the firehose (old clients), on the BMS page (all 821 `BMS/` topics, about half the traffic), on a small page (15–25 topics, socket `i` on page `i % 4`), or on an empty list.

It reports each emit's wall time, and "core": the total emit time divided by the 20 s replayed, i.e. the share of one core the emit loop spends on the simulator's rate. It then times `set_subscriptions` changes from a client packet to its ack, with 14 other sockets on small pages.

The dummy sockets come from socketioxide's `__test_harness` feature, which `Cargo.toml` already enables for dev builds, so a socket's cost stops at its channel: there is no WebSocket framing or TCP, which the live benchmark covers. Sockets register through the public `Subscriptions::register`, as `socket_handler_with_metadata` does, and topic lists go over the wire as client packets. That is why it is a Cargo `[[bench]]` with `harness = false` and not an `#[ignore]` unit test: it needs nothing private (no widening of `socket_subscriptions`), it builds in release (the `bench` profile), and plain `cargo test` never builds or runs it.

## Live end-to-end benchmark

```sh
scylla-server/benchmarks/run.sh   # needs Docker, cargo and Node 22
```

`run.sh` brings up `siren`, `calypso` and `odyssey-db` of the scylla-dev profile on offset 120 (Mosquitto, Calypso's simulator over MQTT, Postgres; ports `5552`, `2003`), builds and starts this branch's server in release on `:8121`, and then:

1. samples for 20 s what an old client receives, to get the simulator's actual topics (`topics-sample.json`), and derives each client's list from it;
2. runs `live.mjs` with 4 mixed clients (old, BMS page, small page, empty list), then 15 old clients, then 15 small-page clients;
3. stops the server and runs develop's published image (`argos-scylla:develop`, host network, `:8122`) with the mixed 4 and the 15 small-page clients as the baseline. On develop every client gets every topic whatever it asks for;
4. tears the stack down (`down -v`). Results go to `results/<timestamp>/` (git-ignored): `summary.md` plus JSON per run.

Knobs: `SECS` (measured seconds, default 30), `WARMUP` (5), `BASELINE=none` (skip develop), `TEARDOWN=0` (keep the stack), and the port variables at the top of the script. To run `live.mjs` alone against any server: `npm ci`, then `node live.mjs --url http://localhost:8121 --clients old,bms,small*4,empty --server-pid <pid>`.

Client kinds: `old` names no topics, as an old Angular build or the Flutter app; `bms` sends every sampled `BMS/` topic in the handshake auth; `small` connects as an old client and then sends a small page with `set_subscriptions` (it rotates over the same 4 pages as the micro-benchmark); `empty` sends `set_subscriptions([])`. Each client is its own Node process (socket.io-client 4.8.1, the Angular client's version, over WebSocket), parses every `data` message as the Angular client does, and reports data msgs/s, data bytes/s (Engine.IO message text, about the WebSocket payload), other events/s (`metadata`, `faults`, `timers`), distinct topics, messages for topics it did not ask for ("unwanted"), its `set_subscriptions` ack time, and its own CPU. The server's CPU and RSS come from `/proc/<pid>`.

## Results

Run 2026-11-20 on a 4 vCPU VM (Intel Xeon @ 2.30 GHz, 15 GB, Linux 6.18), rustc 1.97.0, release builds. Another agent's Argos stack and builds shared the machine (load average 1.3–2.8 during the runs), so read the numbers as an order of magnitude; ranges are two back-to-back runs.

### Micro: cost per `data` emit (µs) and one core's share of ~3,900 msgs/s

| Sockets | Path, subscriptions | mean µs | p50 µs | p99 µs | core | msgs/s per socket |
|---|---|---|---|---|---|---|
| 1 | broadcast (develop) | 2.1–3.0 | 1.0–1.4 | 19–24 | 0.8–1.2 % | 3,909 |
| 1 | rooms, firehose | 2.4–3.3 | 1.1–1.5 | 19–26 | 0.9–1.3 % | 3,909 |
| 1 | rooms, BMS page | 1.2–1.9 | 0.2–0.3 | 18–22 | 0.5–0.7 % | 1,858 |
| 1 | rooms, small page | 0.2 | 0.1 | 2–3 | 0.1 % | 98 |
| 1 | rooms, empty list | 0.07 | 0.07 | 0.1 | 0.03 % | 0 |
| 5 | broadcast (develop) | 3.2–4.5 | 1.9–2.4 | 23–28 | 1.2–1.8 % | 3,909 |
| 5 | rooms, firehose | 2.7–4.3 | 1.6–2.4 | 21–27 | 1.0–1.7 % | 3,909 |
| 5 | rooms, BMS page | 1.5–2.0 | 0.3 | 19–25 | 0.6–0.8 % | 1,858 |
| 5 | rooms, small page | 0.6–0.8 | 0.1 | 11–15 | 0.2–0.3 % | 170 |
| 5 | rooms, empty list | 0.08 | 0.07 | 0.1 | 0.03 % | 0 |
| 15 | broadcast (develop) | 3.9–7.9 | 1.8–5.2 | 25–32 | 1.5–3.1 % | 3,909 |
| 15 | rooms, firehose | 4.0–7.0 | 1.6–5.0 | 16–30 | 1.6–2.7 % | 3,909 |
| 15 | rooms, BMS page | 2.3–4.2 | 0.3–0.4 | 17–26 | 0.9–1.6 % | 1,858 |
| 15 | rooms, small page | 0.8–1.0 | 0.1 | 11–16 | 0.3–0.4 % | 199 |
| 15 | rooms, empty list | 0.08 | 0.07 | 0.2 | 0.03 % | 0 |

- With every socket on the firehose, rooms cost the same as develop's broadcast: the room lookup is lost in the noise.
- A topic nobody reads costs ~0.07 µs (a lock and a hash lookup, no serialization), so with small pages the emit loop costs 4–8× less than broadcast at 15 sockets, and an empty list ~45–100×.
- Neither path is a bottleneck at the simulator's rate: develop's broadcast to 15 sockets is ~2–3 % of a core here, before WebSocket writes.

### Micro: `set_subscriptions` round trip to its ack (µs), 14 other sockets on small pages

| Change | mean | p50 | p99 |
|---|---|---|---|
| first set, old client → small page | 94–148 | 56–82 | 310–2,600 |
| first set, old client → BMS page (821 rooms) | 444–565 | 402–445 | 1,260–2,630 |
| small page A ↔ small page B | 23–53 | 13–52 | 46–84 |
| small page ↔ BMS page | 284–293 | 234–312 | 590–3,060 |
| same small page again (no-op: packet dispatch and ack only) | 8–44 | 7–42 | 34–80 |
| small page ↔ empty list | 31–47 | 32–44 | 140–166 |

A page change costs well under a millisecond, mostly packet dispatch for small pages; joining or leaving the 821 BMS rooms is ~0.3–0.5 ms.

### Live: per client, 30 s measured after 5 s warm-up

The simulator sent ~3,930 msgs/s over 989–1,001 topics (an old client sampled for 20 s). Run 2 shown; run 3 matched within a few percent.

| Server | Client | Topics asked | Ack ms | data msgs/s | data KB/s | Topics seen | Unwanted msgs | Client CPU |
|---|---|---|---|---|---|---|---|---|
| rooms | old | all | - | 3,931 | 491 | 962 | 0 | 3.5 % |
| rooms | BMS page (handshake) | 774 | - | 1,841 | 233 | 696 | 0 | 2.3 % |
| rooms | small page | 25 | 0.7 | 98 | 12 | 25 | 0 | 0.7 % |
| rooms | empty list | 0 | 0.7 | 0 | 0 | 0 | 0 | 0.2 % |
| develop | old | all | - | 3,933 | 492 | 986 | 0 | 3.4 % |
| develop | BMS page | 774 | no ack | 3,933 | 492 | 986 | 66,403 | 3.6 % |
| develop | small page | 25 | no ack | 3,934 | 492 | 991 | 115,091 | 3.5 % |
| develop | empty list | 0 | no ack | 3,935 | 492 | 991 | 118,042 | 3.3 % |

Every client also gets ~10 other events/s (8 on develop's image) of `metadata`, `faults` and `timers`, which still go to everyone. "Topics seen" is below "asked" for the BMS page because some `BMS/` topics send less than once in 30 s.

### Live: totals across clients, and the server process

| Server | Clients | data msgs/s, all clients | data KB/s, all clients | Server CPU (of one core), run 2 / run 3 | Server RSS |
|---|---|---|---|---|---|
| rooms | old, BMS, small, empty | 5,870 | 736 | 7.9 / 5.5 % | 89 MB |
| develop | old, BMS, small, empty | 15,735 | 1,967 | 8.9 / 8.5 % | 57–83 MB |
| rooms | 15 old | 59,010 | 7,377 | 10.4 / 12.7 % | 73–78 MB |
| rooms | 15 small pages | 2,997 | 364 | 5.7 / 6.2 % | 76–87 MB |
| develop | 15 small pages | 59,010 | 7,377 | 10.6 / 12.5 % | 61 MB |

- 15 small-page clients get ~20× fewer messages and bytes than on develop (3,000 vs 59,000 msgs/s; 0.36 vs 7.4 MB/s), and each spends ~0.3–1 % CPU instead of ~2.5 % parsing them (Node; a browser also runs change detection per value).
- Server CPU drops from ~11–13 % to ~6 % of a core for 15 small-page clients; the ~5–6 % left is MQTT ingest and database batching, which every run pays. Old clients on the rooms server cost what they cost on develop.
- `set_subscriptions` acks in ~1 ms; when 15 clients connect and send their pages at once, some acks take 40–50 ms.

### Caveats

- Shared, noisy VM: another agent's demo stack (offset 110) ran on the same 4 vCPUs during the first micro run and the first live attempt, and had stopped by the third live run; other builds kept the load average at 1.3–2.8. Runs were back to back; expect ±30 % on the micro means and a few CPU points on the live numbers.
- The develop baseline is the published `argos-scylla:develop` image (built 2026-10-08), not a build of `origin/develop` from this checkout; its delivery path (broadcast every topic) is the same.
- Client CPU is Node with `JSON.parse`, a lower bound for a browser tab.
- The micro-benchmark's dummy sockets stop at a channel, so it shows the emit loop's cost, not WebSocket writes; the live server CPU includes those.
- Page sets are prefix-based approximations of the BMS page and small pages, not lists taken from the Angular pages.
