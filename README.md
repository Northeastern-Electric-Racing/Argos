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

### Running in Production Mode using Docker

Cd into the angular-client directory and run:

`npm run build`

This will generate the dist file that the nginx server that hosts the application on the router uses. 

Then to build the docker images run: 

`docker-compose build`

To run the docker containers, run the following command (If you are on x86_64 you will have to change platform: linux/arm64 to linux/amd64 in order to properly pull the timescaledb):

`docker-compose up`

This will start the containers and output all the outputs from both of them to the terminal. If the container is not already an image through docker-compose build, it will attempt to pull the images from docker hub. 

Note: If connecting to MQTT, set PROD=true in your .env variabe and add the PROD_SIREN_HOST_URL to your .env file as well, this is the host name for connecting to the mqtt server. 

### Deploying to the Router

If changes are made to either the client or scylla you will need to rebuild and push to docker hub then pull on the router. Contact the current Argos lead or Chief Software Engineer to get access to the docker hub.

Scylla will not be able to communicate with timescale with this configuration. If deploying to router you will have to change the docker-compose file to not use a shared network, instead add `network_mode: host`
instead of 
```
networks: 
   - shared-network
```

This will allow the docker containers to communicate on the openwrt router using the host network. However on mac and windows since docker runs in a vm you will be unable to connect to these containers, you will have to use a shared-network for the timescaledb and then run scylla and the client manually from your machine. 

### Running on the Router

When updating code you will need to go to openwrt on the router and remove the docker container and image for the image(s) you are updating

You only need to copy the docker-compose file from this repository to the router (make sure to change the network mode to be host and not use shared network (see above)) then run `docker-compose up`. Make sure you've pushed the most up to date image to docker hub, if you haven't it will pull the old images. 

## Codegen Protobuf Types

##### Mac

`brew install protobuf@3`
`brew link --overwrite protobuf@3`

#### Codegen
`npm run build:proto`