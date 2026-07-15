# Argos

Our real-time data processing and visualization tool.

## Quickstart

Go through the quickstart sections of client and scylla-server:

[Angular Client](./angular-client/README.md) <br>
[Scylla Server](./scylla-server/README.md) <br>
[Flutter Client](./flutter-client/README.md)

Once you've sucessfully setup Scylla and the Client, you can either run them separately, or follow the development guide to run locally, or pull from published docker images for one or the other (client, or scylla).

## Development

Your guide for everything development for Argos, in the [Odyssey](https://nerdocs.atlassian.net/wiki/spaces/NER/pages/615874585/Odyssey+24A) ecosystem.

### Mock Data & Docker Setup

For mock data and running remote branches for scylla and angular-client, you can refer to [Compose Profiles](./compose/README.md).

Commonly used commands in development:

- `./argos.sh client-dev up`: runs scylla from a remote branch and combined with mock data from related Odyssey containers.

### Schema Related Work

For all changes and adjustments of schema look to [Charybdis](./charybdis/README.md).

## Production

Only used when deploying to the router for testing or comp.

Please see [Compose Profiles](./compose/README.md) to for more info on docker deployment abstractions.

### Starting out

connect to the router and ssh in. (link to confluence?)

Run: `./argos.sh router -d up` to start all stuff up for data collection

### Codegen Protobuf Types (client only)

Server protobuf generation is automatic. See below for client protobuf generation.

##### Mac

`brew install protobuf@3`
`brew link --overwrite protobuf@3`

#### Codegen

`npm run build:proto`

### Siren

The configuration for the Mosquitto MQTT server on the router is in the siren-base folder.
Note that the configuration is used in the docker compose file, but the configuration on the TPU is stored in [Odysseus.](https://github.com/Northeastern-Electric-Racing/Odysseus/tree/cb12fb3240d5fd58adfeae26262e158ad6dd889b/odysseus_tree/overlays/rootfs_overlay_tpu/etc/mosquitto)
