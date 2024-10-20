# Scylla Server

The backend written in Rust for Argos.

## Local Development

Before doing any of the following make sure you've installed Rust: https://www.rust-lang.org/learn/get-started

We specifically need cargo (Rust's build tool and package manager), so run 'cargo --version' to make sure you've correctly installed Rust.

### Setup the Database

In the root project directory run the following to create the timescaledb instance in docker:

```
docker compose up -d odyssey-timescale
```

To setup environment variables, cd into the scylla-server directory and create a file named `.env` containing the following contents:

```
SOURCE_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/postgres
```

To setup Prisma, in the scylla-server directory run:

```
cargo prisma generate
```

To setup the database and seed some data run:

```
cargo prisma migrate deploy
cargo prisma-seed
```

### Run the app

In scylla-server run:

```
cargo run
```

And you're done!

## Test this app

#### Seed some data

Run `cargo prisma-seed`

#### Integration tests

Since this app uses the database for testing, you must follow these steps, or run `./integration_test.sh`:

```
docker volume rm argos_db-data
docker compose up -d odyssey-timescale
cargo prisma migrate deploy
cargo test -- --test-threads=1
```

#### Test it yourself!

You can send your own messages to the app running in production mode, and test how the client, database, etc. reacts!

Follow this confluence doc: https://nerdocs.atlassian.net/wiki/spaces/NER/pages/473727054/How+to+run+data+through+Argos+without+the+car

#### View threads and resources

1. Build or run as: `RUSTFLAGS="--cfg tokio_unstable" cargo run --features top`
2. Install tokio console: ex `cargo install --locked tokio-console`
3. Run app and `tokio-console`

#### Debug logging

#### Activate logs

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

See main README.

#### Env variables & CLI Customization

- `SOURCE_DATABASE_URL` The timescale URL
- `RUST_LOG=none,scylla_server=<LEVEL>` levels of logging for this create, see above

**See `cargo run -- -h` for other variables and settings to change!**
