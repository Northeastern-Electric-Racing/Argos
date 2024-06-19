## Argos

### Initializing Submodule

To initialize the odyssey submodule run `git submodule update --init`

### Running the Project in Dev Mode

To run the project locally for development, you'll want to run the client and the server separately.

Client:

cd into the client directory, and run the following commands:

`npm install`

`npm run start`

Server:

cd into the scylla-server, and run the following commands:

`npm install`

Add this database source url to your .env variable:
`SOURCE_DATABASE_URL="postgresql://postgres:password@localhost:5432/timescaledb"`

If connecting to Siren, set PROD=true in your .env variabe and add the PROD_SIREN_HOST_URL to your .env file as well, this is the host name for connecting to the mqtt server. 

run `docker-compose up` to pull the images from docker hub and start them. 

You can then go into docker desktop and stop the server and the client but leave the timescale database running. 

You can also run `docker-compose up odyssey-timescale` to only start the database

then run:

`npm run prisma:generate`

`npm run prisma:migrate`

Then to actually run the server run:

`npm start`

### Running the Project in Prod Mode

I've setup a docker-compose file, so that you can easily run both these containers with a few commands:

This will build the docker images that will be run:

`docker-compose build`

This will run the two docker images and output all the outputs from both of them to the terminal:

`docker-compose up`

This will start the containers, if the container is not already an image through docker-compose build, it will attempt to pull the images from docker hub. 

### Running on the Openwrt router

Just do `docker compose down` and `docker-compose pull` and `docker-compose up -d`.

### Codegen Protobuf Types

##### Mac

`brew install protobuf@3`
`brew link --overwrite protobuf@3`

#### Codegen
`npm run build:proto`

### Siren
The configuration for the Mosquitto MQTT server on the router is in the siren-base folder.
Note that the configuration is used in the docker compose file, but the configuration on the TPU is stored in [Odysseus.](https://github.com/Northeastern-Electric-Racing/Odysseus/tree/cb12fb3240d5fd58adfeae26262e158ad6dd889b/odysseus_tree/overlays/rootfs_overlay_tpu/etc/mosquitto)
