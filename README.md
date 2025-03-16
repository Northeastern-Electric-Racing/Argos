# Argos

Our real-time data processing and visualization tool.

---

## Quickstart

Go through the local development sections of client and scylla-server:

[Angular Client](./angular-client/README.md)\
[Scylla Server](./scylla-server/README.md)

Once you've sucessfully setup Scylla and the Client, you can either run them separately, or follow the development guide to setup pull from published docker images for one or the other.

---

## Development

Your guide for everything development for Argos, in the [Odyssey](https://nerdocs.atlassian.net/wiki/spaces/NER/pages/615874585/Odyssey+24A) ecosystem.

---

### Mock Data & Docker Setup

For mock data and running remote branches for scylla and angular-client, you can refer to [Compose Profiles](./compose/README.md).

Commonly used commands in development:

- `./argos.sh client-dev up`: runs scylla from a remote branch and combined with mock data from related Odyssey containers.

---

## Production

Please see [Compose Profiles](./compose/README.md) to for more info on docker deployment abstractions.

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
