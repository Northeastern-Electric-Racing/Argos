# Keep Argos-only data in its own database container

Data that Argos stores for itself rather than from the car, starting with the map's tracks and each Run's laps, lives in its own Postgres container, `argos-db`, with its data on a bind mount. scylla connects through `ARGOS_DATABASE_URL`, retrying in the background until it answers, and runs its own Diesel migrations from `scylla-server/argos_migrations/`. Until then scylla runs as before: only the routes and features that need it fail.

## Considered Options

- A JSON file on scylla's volume. Rejected: not in the database, and not shared by every scylla that points at the same Postgres.
- Each Run's lines as `Argos/Track/*` datapoints. Rejected: datapoint values are floats only, and every datapoint needs a Run.
- A new table in the car database. Rejected: the car database stays car data only, so it is easy to reason about and query in Grafana, and a test-day database that hasn't been wiped wouldn't get the table without a manual migration.
- A separate Postgres schema in the car database. Rejected: it keeps the data in the car database that Charybdis and the cloud upload manage.
- A separate database on the car's Postgres server. Rejected: the test-day `down -v` that wipes the car database deletes it too.
- Its own container on a named volume. Rejected: `down -v` deletes named volumes as well; it leaves bind mounts alone.
- Its own container on a bind mount (chosen).

## Why this shape

- **The car database stays car-only.** Charybdis, the cloud upload and Grafana never see Argos-only data.
- **It outlasts test-day wipes.** Tracks drawn once are there next test day. Run ids restart after a wipe, so saved laps are told apart by their times.
- **It deploys onto any test-day setup.** scylla migrates it itself, so a deploy needs no manual SQL.
- **Telemetry never depends on it.** scylla starts without it and keeps retrying; telemetry, the car database and the cloud upload work as before.
- **One place for the next feature.** Metadata, user settings and other Argos-only data get a migration here instead of a new pattern each time.

## Consequences

- One more Postgres container in every compose profile and a second connection pool in scylla; integration tests need both databases.
- Schema changes to it are Diesel migrations (`diesel migration generate --config-file diesel.argos.toml`), not Charybdis ones; `scylla-server/README.md` has the commands.
- Its data isn't uploaded to the cloud. `down -v` keeps it; deleting `compose/argos-db-data` wipes it.
