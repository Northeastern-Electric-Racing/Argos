# Scylla Server

The backend for argos, processes data storing it into the database, sends messages over MQTT to the car, and broadcasts data and metadata to the frontend.

---

## Quickstart

[Install rust](https://www.rust-lang.org/tools/install)

### Extensions to install

Please install by searching that id(s) in vs code extensions.

rust analysizer: `rust-lang.rust-analyzer`

##### Windows only

Download PostgreSQL: (https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)

In powershell run:

1. $env:PQ_LIB_DIR = "C:\ProgramFiles\PostgreSQL\18\lib"
2. [System.Environment]::SetEnvironmentVariable("PQ_LIB_DIR", "C:\ProgramFiles\PostgreSQL\18\lib", "User")

Make sure that the file path is correct and points to your PostgreSQL's lib folder before you run these commands.
Your file path may not match the ones above exactly, but will look similar.

In scylla-server run:

```
cargo clean
```

### Run the app

In scylla-server run:

```
cargo run
```

And you're done!

---

## Development Guide

This section should be your first refrence when developing or running into development issues.

---

### Test this app

#### Get started with DB:

We use diesel, for our ORM: [diesel docs](https://diesel.rs/guides/getting-started).

However, when creating schema changes please use charybis, [Charybdis README](../charybdis/README.md).

#### Integration tests:

Since this app uses the database for testing, you must:

1. Install the [diesel CLI](https://diesel.rs/guides/getting-started.html#installing-diesel-cli) globally.
2. run `./integration_test.sh`:

<!-- #### Test it yourself!

You can send your own messages to the app running in production mode, and test how the client, database, etc. reacts!

Follow this confluence doc: https://nerdocs.atlassian.net/wiki/spaces/NER/pages/473727054/How+to+run+data+through+Argos+without+the+car -->

---

#### View threads and resources

1. Build or run as: `RUSTFLAGS="--cfg tokio_unstable" cargo run --features top`
2. Install tokio console: ex `cargo install --locked tokio-console`
3. Run app and `tokio-console`

---

### Logging

#### Debug logging / Activate logs

Modify the RUST_LOG env variable. Usually you dont want third party crate logs, so `RUST_LOG=none,scylla_server=trace`. You can replace both none and trace with the levels you want. The levels are:

- none: not a darn thing
- trace: very verbose, could print on every message, which would flood the log especially if run on a server receiving millions of the cars messages
- debug: helpful info not constantly printed in high load situations, good for periodic task info or init/end status checks
- info: user-facing info that is optional, usually to notify of a setting change or whatnot
- warn: info the user should take note of as an error may have occured
- error: a critical byt survivable issue in the application

#### Develop with logs

When developing, take advantage of easy logging. Use `debug!`, `trace!` etc macros. with anything you may need, but be sure to abide by the conventions above when making a final PR.

Have an async function that takes time and is somewhat important for performance? Use tracing::instrument macro on the function definition to capture performance data.

## Deploy this app

See [main README](../README.md).

#### Env variables & CLI Customization

- `SOURCE_DATABASE_URL` The timescale URL
- `RUST_LOG=none,scylla_server=<LEVEL>` levels of logging for this create, see above

**See `cargo run -- -h` for other variables and settings to change!**
