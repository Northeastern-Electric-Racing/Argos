## Argos

### Initializing Submodule

To initialize the odyssey submodule run `git submodule init` and `git submodule update`

### Running the Project in Dev Mode

To run the project locally for development, you'll want to run the client and the server separately.

Client:

cd into the client directory, and run the following commands:

`npm install`

`npm run start`

Server:

cd into the scylla-server, and run the following commands:

`npm install`

If it's your first time setting up the repo locally, run:

`npm run prisma:generate`

`npm run prisma:migrate`

Then to actually run the server run:

`npm run start`

### Running the Project in Prod Mode

I've setup a docker-compose file, so that you can easily run both these containers with a few commands:

This will build the docker images that will be run:

`docker compose build`

This will run the two docker images and output all the outputs from both of them to the terminal:

`docker compose up`

##### Codegen Protobuf Types

`npm run build:proto`