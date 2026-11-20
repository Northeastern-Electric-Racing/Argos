# Selective delivery benchmarks

Measures what delivering each topic through its own Socket.IO room (epic #991, ADR 0009, `src/socket_subscriptions.rs`) saves over develop's broadcast of every topic to every client, on the simulator's real topics.

| File | What it is |
|---|---|
| `selective_delivery.rs` | Server micro-benchmark: cost of each `data` emit, and of `set_subscriptions` changes, against in-process dummy sockets |
| `live.mjs` | Live end-to-end benchmark: N real Socket.IO clients against a running scylla-server, each with its own topic list |
| `run.sh` | Brings up an offset scylla-dev stack with Calypso's simulator, samples its topics, runs `live.mjs` and the micro-benchmark against this branch's server, then `live.mjs` against develop's, and tears down |

## Server micro-benchmark

`run.sh` runs it on the simulator sample it records (`MICRO=0` skips it). To run it alone, point it at a sample:

```sh
cd scylla-server && SIM_SAMPLE=benchmarks/results/<run>/topics-sample.json cargo bench --bench selective_delivery
```

A sample is what an old client received from a server on Calypso's simulator: each topic's message count over 20 s, from `live.mjs --sample-only`. The benchmark replays it (each topic's messages evenly spaced and interleaved) through two emit paths, with 1, 5 and 15 sockets:

- broadcast: `io.emit` of the serialized `ClientData` to every socket, which is what develop's `send_socket_msg` does;
- rooms: `Subscriptions::emit_data`, with every socket on the firehose (old clients), on the BMS page (every `BMS/` topic, about half the traffic), on a small page (15–25 topics, socket `i` on page `i % 4`), or on an empty list.

It reports each emit's wall time, and "core": the total emit time divided by the seconds replayed, i.e. the share of one core the emit loop spends on the simulator's rate. It then times `set_subscriptions` changes from a client packet to its ack, with 14 other sockets on small pages.

The dummy sockets come from socketioxide's `__test_harness` feature, which `Cargo.toml` already enables for dev builds, so a socket's cost stops at its channel: there is no WebSocket framing or TCP, which the live benchmark covers. Sockets register through the public `Subscriptions::register`, as `socket_handler_with_metadata` does, and topic lists go over the wire as client packets. That is why it is a Cargo `[[bench]]` with `harness = false` and not an `#[ignore]` unit test: it needs nothing private (no widening of `socket_subscriptions`), it builds in release (the `bench` profile), and plain `cargo test` never builds or runs it.

## Live end-to-end benchmark

```sh
scylla-server/benchmarks/run.sh   # needs Docker, cargo and Node 22
```

`run.sh` brings up `siren`, `calypso` and `odyssey-db` of the scylla-dev profile on offset 120 (Mosquitto, Calypso's simulator over MQTT, Postgres; ports `5552`, `2003`), builds and starts this branch's server in release on `:8121`, and then:

1. samples for 20 s what an old client receives, to get the simulator's actual topics and rates (`topics-sample.json`), and derives each client's list from it;
2. runs `live.mjs` with 4 mixed clients (old, BMS page, small page, empty list), then 15 old clients, then 15 small-page clients;
3. stops the server and runs the micro-benchmark on the same sample (`micro.md`);
4. runs develop's server on `:8122` with the mixed 4 and the 15 small-page clients as the baseline. On develop every client gets every topic whatever it asks for. By default that is the published image (`argos-scylla:develop`, host network, so Linux only); `BASELINE=build DEVELOP_DIR=<checkout of develop>` builds it in release instead, in its own target dir, which also works on macOS;
5. tears the stack down (`down -v`). Results go to `results/<timestamp>/` (git-ignored): `summary.md` plus JSON per run.

Knobs: `SECS` (measured seconds, default 30), `WARMUP` (5), `BASELINE=build` or `none` (build develop, or skip it), `MICRO=0` (skip the micro-benchmark), `TEARDOWN=0` (keep the stack), and the port variables at the top of the script. To run `live.mjs` alone against any server: `npm ci`, then `node live.mjs --url http://localhost:8121 --clients old,bms,small*4,empty --server-pid <pid>`.

Client kinds: `old` names no topics, as an old Angular build or the Flutter app; `bms` sends every sampled `BMS/` topic in the handshake auth; `small` connects as an old client and then sends a small page with `set_subscriptions` (it rotates over the same 4 pages as the micro-benchmark); `empty` sends an empty list with `set_subscriptions`. Each client is its own Node process (socket.io-client 4.8.1, the Angular client's version, over WebSocket), parses every `data` message as the Angular client does, and reports data msgs/s, data bytes/s (Engine.IO message text, about the WebSocket payload), other events/s (`metadata`, `faults`, `timers`), distinct topics, messages for topics it did not ask for ("unwanted"), its `set_subscriptions` ack time, and its own CPU. The server's CPU and RSS come from `/proc/<pid>`, or from `ps` where there is no `/proc` (macOS).

## Results

Run 2026-11-20 on an Apple M4 Pro (14 cores, 48 GB, macOS), rustc 1.98.1, release builds; Docker (8 CPUs) ran the stack. The develop baseline is a release build of `develop` at cc50fa06 (`BASELINE=build`). One run each; other work on the machine kept the load average at 5–7, so read the numbers as an order of magnitude.

### Micro: cost per `data` emit (µs) and one core's share of ~3,900 msgs/s

| Sockets | Path, subscriptions | mean µs | p50 µs | p99 µs | core | msgs/s per socket |
|---|---|---|---|---|---|---|
| 1 | broadcast (develop) | 0.96 | 0.79 | 2.6 | 0.37 % | 3,909 |
| 1 | rooms, firehose | 0.95 | 0.83 | 2.0 | 0.37 % | 3,909 |
| 1 | rooms, BMS page | 0.59 | 0.12 | 2.1 | 0.23 % | 1,858 |
| 1 | rooms, small page | 0.17 | 0.08 | 2.9 | 0.07 % | 98 |
| 1 | rooms, empty list | 0.04 | 0.04 | 0.04 | 0.01 % | 0 |
| 5 | broadcast (develop) | 1.44 | 1.29 | 3.5 | 0.56 % | 3,909 |
| 5 | rooms, firehose | 1.81 | 1.42 | 6.3 | 0.71 % | 3,909 |
| 5 | rooms, BMS page | 1.01 | 0.17 | 4.8 | 0.40 % | 1,858 |
| 5 | rooms, small page | 0.41 | 0.08 | 2.8 | 0.16 % | 170 |
| 5 | rooms, empty list | 0.08 | 0.08 | 0.08 | 0.03 % | 0 |
| 15 | broadcast (develop) | 3.05 | 2.58 | 11.3 | 1.19 % | 3,909 |
| 15 | rooms, firehose | 3.40 | 3.17 | 11.4 | 1.33 % | 3,909 |
| 15 | rooms, BMS page | 1.64 | 0.17 | 11.7 | 0.64 % | 1,858 |
| 15 | rooms, small page | 0.52 | 0.08 | 4.0 | 0.20 % | 199 |
| 15 | rooms, empty list | 0.09 | 0.08 | 0.25 | 0.04 % | 0 |

- With every socket on the firehose, rooms cost about what develop's broadcast does (within ~10–25 %).
- A topic nobody reads costs ~0.08 µs (a lock and a hash lookup, no serialization), so at 15 sockets small pages make the emit loop ~6× cheaper than broadcast, and empty lists ~35×.
- Neither path is a bottleneck at the simulator's rate: develop's broadcast to 15 sockets is ~1.2 % of a core, before WebSocket writes.

### Micro: `set_subscriptions` round trip to its ack (µs), 14 other sockets on small pages

| Change | mean | p50 | p99 |
|---|---|---|---|
| first set, old client → small page | 85 | 84 | 180 |
| first set, old client → BMS page (821 rooms) | 766 | 766 | 1,351 |
| small page A ↔ small page B | 29 | 28 | 59 |
| small page ↔ BMS page | 228 | 193 | 626 |
| same small page again (no-op: packet dispatch and ack only) | 22 | 21 | 58 |
| small page ↔ empty list | 32 | 28 | 72 |

A page change costs well under a millisecond; joining the 821 BMS rooms from the firehose is the slowest, at ~0.8 ms.

### Live: per client, 30 s measured after 5 s warm-up

The simulator sent ~4,040 msgs/s over ~1,000 topics (an old client sampled for 20 s).

| Server | Client | Topics asked | Ack ms | data msgs/s | data KB/s | Topics seen | Unwanted msgs | Client CPU |
|---|---|---|---|---|---|---|---|---|
| rooms | old | all | - | 4,042 | 505 | 1,056 | 0 | 5.8 % |
| rooms | BMS page (handshake) | 777 | - | 1,872 | 237 | 765 | 0 | 3.4 % |
| rooms | small page | 25 | 0.5 | 98 | 12 | 25 | 0 | 0.5 % |
| rooms | empty list | 0 | 0.3 | 0 | 0 | 0 | 0 | 0.1 % |
| develop | old | all | - | 4,053 | 507 | 1,002 | 0 | 6.2 % |
| develop | BMS page | 777 | no ack | 4,053 | 507 | 1,002 | 67,704 | 6.1 % |
| develop | small page | 25 | no ack | 4,045 | 506 | 1,019 | 118,410 | 5.9 % |
| develop | empty list | 0 | no ack | 4,045 | 506 | 1,019 | 121,360 | 6.3 % |

Every client also gets ~10 other events/s of `metadata`, `faults` and `timers`, which still go to everyone. "Topics seen" is below "asked" for the BMS page because some `BMS/` topics send less than once in 30 s.

### Live: totals across clients, and the server process

| Server | Clients | data msgs/s, all clients | data KB/s, all clients | Server CPU (of one core) | Server RSS |
|---|---|---|---|---|---|
| rooms | old, BMS, small, empty | 6,012 | 755 | 9.5 % | 94 MB |
| develop | old, BMS, small, empty | 16,196 | 2,025 | 13.2 % | 101 MB |
| rooms | 15 old | 60,858 | 7,608 | 20.3 % | 89 MB |
| rooms | 15 small pages | 3,046 | 371 | 8.2 % | 109 MB |
| develop | 15 small pages | 60,782 | 7,599 | 20.0 % | 71 MB |

- 15 small-page clients get ~20× fewer messages and bytes than on develop (3,000 vs 61,000 msgs/s; 0.37 vs 7.6 MB/s), and each spends 0.3–2.2 % CPU instead of ~5 % parsing them (Node; a browser also runs change detection per value).
- Server CPU drops from 20 % to 8 % of a core for 15 small-page clients; what is left is mostly MQTT ingest and database batching, which every run pays. Old clients on the rooms server cost what they cost on develop.
- `set_subscriptions` acks in 0.3–1.4 ms, including when 15 clients connect and send their pages at once.

### Caveats

- A busy laptop, not an idle server: other work kept the load average at 5–7 on 14 cores; one run each, so expect ±30 % on the micro means and a few CPU points on the live numbers.
- macOS has no `/proc`: server CPU and RSS come from `ps`, sampled at the start and end of each run.
- Client CPU is Node with `JSON.parse`, a lower bound for a browser tab.
- The micro-benchmark's dummy sockets stop at a channel, so it shows the emit loop's cost, not WebSocket writes; the live server CPU includes those.
- Page sets are prefix-based approximations of the BMS page and small pages, not lists taken from the Angular pages.
- The micro numbers above replayed an earlier 20 s sample of the simulator (1,048 topics, ~3,900 msgs/s) committed as a file; `run.sh` now replays each run's own sample.
