# Keep Argos-only data in its own `argos_experimental` database

Data that Argos stores for itself rather than from the car, starting with the map's tracks and timing lines, lives in a separate `argos_experimental` database on the same Postgres server as the car database. scylla creates it on startup if it is missing and runs its own Diesel migrations from `scylla-server/argos_migrations/`. If it can't, scylla logs a warning and keeps running: only the routes and features that need it fail.

## Considered Options

- A JSON file on scylla's volume. Rejected: not in the database, and not shared by every scylla that points at the same Postgres.
- Each Run's lines as `Argos/Track/*` datapoints. Rejected: datapoint values are floats only, and every datapoint needs a Run.
- A new table in the car database. Rejected: the car database stays car data only, so it is easy to reason about and query in Grafana, and a test-day database that hasn't been wiped wouldn't get the table without a manual migration.
- A separate Postgres schema in the car database. Rejected: it keeps the data in the car database that Charybdis and the cloud upload manage.
- A separate database on the same server (chosen).

## Why this shape

- **The car database stays car-only.** Charybdis, the cloud upload and Grafana never see Argos-only data.
- **It deploys onto any test-day database.** The database and its tables are created by scylla itself, so a deploy needs no manual SQL.
- **Telemetry never depends on it.** Its pool is optional; without it, telemetry, the car database and the cloud upload work as before.
- **One place for the next feature.** Metadata, user settings and other Argos-only data get a migration here instead of a new pattern each time.

## Consequences

- scylla holds a second connection pool, and integration tests set up both databases.
- Schema changes to it are Diesel migrations (`diesel migration generate --config-file diesel.argos.toml`), not Charybdis ones; `scylla-server/README.md` has the commands.
- Its data isn't uploaded to the cloud; `docker compose down -v` deletes it with the rest of the Postgres volume.
