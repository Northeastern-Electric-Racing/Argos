# Argos

### Initializing Submodule

To initialize the odyssey submodule run `git submodule update --init`

## Local Development

Setup angular-client and scylla-server:

[Angular Client](./angular-client/README.md)\
[Scylla Server](./scylla-server/README.md)

Once you've sucessfully setup Scylla and the Client, you can either run them separately, or run the following command to run them concurrently (the outputs from both will be output to the same terminal):

`npm run start`

## Production

The base docker compose (`compose.yml`) contains some important features to note.  However, it is useless standalone.  Please read the profile customization selection below before using the base compose.
- It matches the number of CPUs as the router to roughly simulate router CPU (your CPU is still faster)
- It persists the database between `down` commands via a volume called `argos_db-data`.  Delete it with `docker volume rm argos_db-data` to start with a new database next `up`.
- It weighs the CPU usage of siren higher, so it is prioritized in CPU starvation scenarios.
- It limits memory according to the capacity of the router.


### Customizing runtime profiles of the project via docker compose

This project uses docker compose overrides to secify configurations.  Therefore there are multiple "profiles" to choose from when running in production, and there are some profiles for development testing.  Also, there are fragment files for siren and client in `siren-base` and `angular-client` respectively, as they are services only used in certain cases.  These profiles are specified via the command line on top of the base `compose.yml` file as follows.

```
docker compose -f compose.yml -f <override_file_name> <your command here>
```

Additionally if you need to create your own options, you can create a `compose.override.yml` file in this directory and specify what settings should be changed, which is ignored by git.  If you think the override would become useful, document it here and name it `compose.<name>.yml`. Here is the current list of overrides, designed so only one is used at any given time:

- `scylla-dev`*: Testing the client and interactions of scylla (scylla prod, siren local, client pt local)
- `client-dev`*: Testing the client development using the scylla mock data mode (scylla mock, client pt local)
- `router`: For production deployment to the base gateway node (scylla prod, siren local, client pt 192.168.100.1)
- `tpu`: Production deployment to the TPU on the car (no client, no siren, scylla pt siren external)

***Note that since client settings are changed via rebuild, overrides with a * must be rebuilt via `docker compose -f compose.yml -f compose.<override>.yml build client`.  Further, a build should be done when reverting to profiles without stars. **

Examples:

Router deploy and send to background: `docker compose -f compose.yml -f compose.router.yml up -d`



## Codegen Protobuf Types (client only)

Server protobuf generation is automatic.  See below for client protobuf generation.

##### Mac

`brew install protobuf@3`
`brew link --overwrite protobuf@3`

#### Codegen
`npm run build:proto`

### Siren
The configuration for the Mosquitto MQTT server on the router is in the siren-base folder.
Note that the configuration is used in the docker compose file, but the configuration on the TPU is stored in [Odysseus.](https://github.com/Northeastern-Electric-Racing/Odysseus/tree/cb12fb3240d5fd58adfeae26262e158ad6dd889b/odysseus_tree/overlays/rootfs_overlay_tpu/etc/mosquitto)
