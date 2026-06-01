# Argos

Argos is the real-time telemetry platform for Northeastern Electric Racing. Data flows from the car's CAN nodes, through the Siren MQTT broker, into scylla-server (which persists it and rebroadcasts it live), and out to the angular-client dashboard. This file defines the domain vocabulary shared across those components; the workflow/agent-tooling vocabulary lives in `docs/agents/glossary.md`.

## Language

### Telemetry data model

**DataType**:
A named measurement class paired with a unit — e.g. `BMS/Status/Temp_Average` measured in `C`. Identified by its `name`, which is also the MQTT topic string. Every datapoint belongs to exactly one DataType.
_Avoid_: Channel, signal, metric, field.

**Run**:
A single telemetry session, identified by `runId`, capturing the driver, location, notes, and start time. All data ingested while a run is active is stamped with its `runId`. One Run holds many datapoints.
_Avoid_: Session, trip, lap, test.

**Data** (a **datapoint**):
One timestamped measurement for a given DataType within a given Run. Its `values` is a vector of floats (most DataTypes carry one, some carry several), keyed by `(time, dataTypeName, runId)`.
_Avoid_: Sample, reading, record, row.

**Topic**:
The slash-delimited MQTT path a telemetry stream is published under — e.g. `VCU/CarState/speed`. A topic maps one-to-one onto a DataType `name`. A handful of synthetic topics (`Argos/Message_Rate`, `Argos/Viewers`, `Latency`) are generated server-side and broadcast live but never persisted.
_Avoid_: Path, channel, stream.

**Node**:
An on-vehicle CAN device that reports faults — one of `Bms`, `Dti`, `Mpu`, `Charger`. Used for attributing faults to their source.
_Avoid_: Device, ECU, board, unit.

### Alerting

**Fault**:
A discrete fault event raised by a Node, tracked with its first-occurrence time, last-seen time, and an expired flag once it stops recurring.
_Avoid_: Error, alarm, warning.

**Rule**:
A user-defined condition on a topic's values (a boolean expression like `a > 100`) that notifies subscribers when it matches, subject to a debounce interval.
_Avoid_: Trigger, alert, condition, watch.

### Components

**scylla-server**:
The Rust/Axum backend. Subscribes to every MQTT topic, parses incoming protobuf into datapoints, stamps them with the active `runId`, batch-upserts them to Postgres, and rebroadcasts live data over a Socket.IO websocket. Owns the rule engine and the REST API.
_Avoid_: Backend, server, API (when a more specific term fits).

**angular-client**:
The Angular dashboard that renders live and historical telemetry, run history, faults, and rules, and sends car commands.
_Avoid_: Frontend, UI, app.

**Siren**:
The Mosquitto MQTT broker (`siren-base/`) that ingests CAN telemetry from the car and publishes it for scylla-server to consume.
_Avoid_: Broker, MQTT (as a synonym for Siren specifically).

**Charybdis**:
The database schema and data migration tooling (`charybdis/`) — Prisma for the cloud DB, Diesel for local — plus the dump/upload sync between them.
_Avoid_: Migrations, Prisma (as a synonym for Charybdis).

**Calypso**:
The car-side encoder that subscribes to `Calypso/Bidir/Command/*` topics published by scylla-server and converts them into CAN messages for the vehicle. The local stack runs a Calypso simulator in its place.
_Avoid_: Simulator, encoder (without naming Calypso).

## Flagged ambiguities

- **Node** is overloaded. In this glossary it means a CAN device (`Bms`/`Dti`/`Mpu`/`Charger`). The angular-client also has a `Node` type that is a UI topic-tree element, and "node" can mean an MQTT client. Always qualify: "CAN node", "tree node", "MQTT client".
- **DataType vs Topic.** They share a string (`DataType.name` == the MQTT topic), but a Topic is the live MQTT routing path while a DataType is the persisted measurement class. Use "topic" when talking about MQTT/subscriptions, "DataType" when talking about stored data and units.
- **Data** is both the singular and plural here; say "a datapoint" for one and "data" for the collection to avoid confusion with the `Data` struct.

## Example dialogue

> **Dev:** When a run starts, does each topic get its own row?
> **Domain expert:** Not per topic — per datapoint. Each datapoint is one timestamp for one DataType inside that Run. A topic like `VCU/CarState/speed` maps to a single DataType, and you'll get a datapoint every time Siren publishes on it.
> **Dev:** And if the pack overheats?
> **Domain expert:** That's a Fault, raised by the `Bms` node — separate from the datapoints. If someone also wrote a Rule on `BMS/Status/Temp_Average` like `a > 60`, that Rule fires its own notification to subscribers.
