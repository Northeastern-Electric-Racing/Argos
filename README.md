## Argos

I've setup the barebones skeleton for what we're gonna be running on the telemetry hub router. It's a react app running in its own docker container and an express server (scylla) setup with prisma and sqlite in its own docker container (prisma and sqlite to probably be swapped out with other things later, this was just what I knew, so I set it up with them for now).

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
