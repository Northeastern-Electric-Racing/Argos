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

If changes are made to either the client or scylla you will need to rebuild and push to hub in order to pull on the router. You may not have permissions to push to the hub, contact head of application software to gain permission.

This will run the two docker images and output all the outputs from both of them to the terminal:

If you are on x86_64 you will have to change platform: linux/arm64 to linux/amd64 in order to properly pull the timescaledb

`docker-compose up`

This will start the containers, if the container is not already an image through docker-compose build, it will attempt to pull the images from docker hub. 

Scylla will not be able to communicate with timescale with this configuration. If deploying to router you will have to change the docker-compose file to not use a shared network, instead add `network_mode: host`
instead of 
```
networks: 
   - shared-network
```

This will allow the docker containers to communicate on the openwrt router using the host network. However on mac and windows since docker runs in a vm you will be unable to connect to these containers, you will have to use a shared-network for the timescaledb and then run scylla and the client manually from your machine. 

### If running on the router

If updating code you will need to go to the openwrt and remove the docker container and image for the image you are updating

you will only need to copy the docker-compose file from this repository to the router (make sure to change the network mode to be host and not use shared network (see above)) then run `docker-compose up`. Make sure you've pushed the most up to date image to docker hub, if you havn't it will pull the old images. 

### Codegen Protobuf Types

##### Mac

`brew install protobuf@3`
`brew link --overwrite protobuf@3`

#### Codegen
`npm run build:proto`