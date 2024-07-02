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

### Running the Project in Prod Mode

There is a `docker-compose-dev.yml` file for a dev which varies from the router deployment:
- It matches the number of CPUs as the router to roughly simulate router CPU (your CPU is still faster)
- You must build it locally first!
- It does not persist the database between `down` commands

Note that both compose files limit memory to the same amount.  However, the disk I/O of the router is **much** slower than yours.

This will build the docker images that will be run:

`docker-compose -f ./docker-compose-dev.yml build`

This will start the containers and output all the outputs from both of them to the terminal. If the container is not already an image through docker-compose build, it will attempt to pull the images from docker hub. 

`docker-compose up`

If changes are made to either the client or scylla you will need to rebuild and push to docker hub then pull on the router. Contact the current Argos lead or Chief Software Engineer to get access to the docker hub.

### Running on the Openwrt router

The `docker-compose.yml` file is made for the router.  When you push a commit it automatically gets built for the router in 20-30 minutes.
To use a non-standard branch edit the docker-compose.yml file to the name of the tag specified by the name [here](https://github.com/Northeastern-Electric-Racing/Argos/pkgs/container/argos).
Then do `docker compose down` and `docker compose pull` and `docker compose up -d`.

**The database is stored in a volume called `argos_db-data`, delete the volume to start the database fresh!**

## Codegen Protobuf Types

##### Mac

`brew install protobuf@3`
`brew link --overwrite protobuf@3`

#### Codegen
`npm run build:proto`

### Siren
The configuration for the Mosquitto MQTT server on the router is in the siren-base folder.
Note that the configuration is used in the docker compose file, but the configuration on the TPU is stored in [Odysseus.](https://github.com/Northeastern-Electric-Racing/Odysseus/tree/cb12fb3240d5fd58adfeae26262e158ad6dd889b/odysseus_tree/overlays/rootfs_overlay_tpu/etc/mosquitto)
