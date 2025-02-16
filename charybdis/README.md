# Charybdis Guide

## The Command Line Interface (both interactive and cmd line options available)

This section provides info on the CLI for uploading data from a local db to a cloud db
For database management and migration, see [Charybdis Database management and migration scripts](#charybdis-database-management-and-migration-scripts).

---

#### Running the CLI Interactively

To start the interactive CLI menu, run:

```sh
yarn start
```

---

#### Running Commands Directly

You can execute specific commands using the `--command` (`-c`) flag:

```sh
yarn start --command dump
```

or using the short version:

```sh
yarn start -c dump
```

##### Available Commands:

- `dump` - Dumps the local database.
- `upload` - Uploads data to the cloud.
- `delete-all-downloads` - Deletes all downloaded files.

Example:

```sh
yarn start -c upload
```

```sh
yarn start -c delete-all-downloads
```

---

#### Modifying Batch Sizes During a Command

Batch sizes do not persist between commands. If needed, set batch sizes while executing a command.

##### Example: Set Batch Size While Dumping Data

```sh
yarn start -c dump -b download-data-batch-size 30000
```

##### Example: Set Batch Size While Uploading Data

```sh
yarn start -c upload -b upload-data-batch-size 5000
```

##### Example: Modify Multiple Batch Sizes With a Command

```sh
yarn start -c upload -b download-data-batch-size 30000 upload-data-batch-size 5000
```

```sh
yarn start -c dump -b download-data-batch-size 30000 download-data-type-batch-size 2000 upload-data-batch-size 6000 upload-data-type-batch-size 4000
```

---

#### Changing Database URLs During a Command

Database URLs must be set while executing a command. They do not persist between commands and are typically only useful for `upload` and `dump` operations.

##### Example: Set Local Database URL While Dumping Data

```sh
yarn start -c dump --url-local "postgres://user:password@localhost:5432"
```

##### Example: Set Cloud Database URL While Uploading Data

```sh
yarn start -c upload --url-cloud "postgresql://postgres:docker@localhost:8001/postgres?schema=public"
```

---

#### Combining Multiple Flags

You can mix commands, batch updates, and database URL updates in a single execution.

##### Example 1: Dump Data & Modify Batch Size

```sh
yarn start -c dump -b download-data-batch-size 25000 upload-data-batch-size 5000 --url-local "postgres://user:password@localhost:5432/mydb"
```

##### Example 2: Upload Data & Modify Multiple Settings

```sh
yarn start -c upload -b download-data-type-batch-size 2000 upload-data-batch-size 7000 --url-cloud "postgres://user:password@cloudserver:5432/mydb"
```

---

#### Summary

- Use `-c` or `--command` to run a specific task.
- Use `-b` or `--batch` to modify batch settings during a command.
- Use `--url-local` and `--url-cloud` to update database URLs **while executing a command**.
- Multiple options can be combined in a single command.

This guide provides a structured way to use your CLI efficiently.

<br><br>
<br><br>

<a id="charybdis-migration"></a>

## Charybdis Database management and migration scripts

make sure you [install yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable) if you don't have it already.

and install prisma globally... it's just easier that way(if you have trouble just follow this: [prisma install instructions](https://www.prisma.io/docs/orm/tools/prisma-cli)).

To initialize the databases run `yarn database:setup` (if this command fails, you should run `yarn database:teardown` before running again.)

You can also individually teardown and bringup the databases by running `yarn database:cloud:setup` or `yarn database:local:setup` and `yarn database:cloud:teardown` or `yarn database:local:teardown`.

To teardown all the databases run `yarn database:teardown`

When updating the local database schema, _Delete the existing migrations files in local-prisma_ and then run `yarn prisma:local:migrate:dev`. Ensure to name the file `init`. This will create the migration file, then run a script to enforce NOT NULL constraints that prisma gurantees put refuses to support in migration sql, copy it to scylla and rerun the diesel migration onto the database to ensure consistency between the two projects, it will also update the diesel schema.rs file according to the new migration (this should be checked to ensure it is based on the expected types, made in your prisma schema).

IMPORTANT: the above will fail if you have more than the two expect migration folder in /scylla-server/migrations : _00000000000000_diesel_initial_setup_, and the working migration folder: _2024-11-10-031516_create_all_ <--- this will we be where the diesel migration file that is getting updated.

When updating the cloud schema, only run `yarn prisma:migrate:cloud:dev` and name it appropriately to whatever changes were made. Ensure that when deploying migrations to the cloud you only run `yarn prisma:migrate:cloud`. You will also have to change the cloud database url in your .env file to point to the cloud database

To access the prisma client for each respective database ensure that you use the proper prisma client from the cloud-prisma and local-prisma prisma files respectively. AKA to access the cloud prisma ensure you are importing `prisma` from `cloud-prisma/prisma.ts`. To access local prisma ensure you are importing `prisma` from `local-prisma/prisma.ts`.
