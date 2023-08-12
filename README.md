## TELEMETRY HUB

I've setup the barebones skeleton for what we're gonna be running on the telemetry hub router. It's a react app running in its own docker container and an express server (scylla) setup with prisma and sqlite in its own docker container (prisma and sqlite to probably be swapped out with other things later, this was just what I knew, so I set it up with them for now).

### Running the Project

I've setup a docker-compose file, so that you can easily run both these containers with a few commands:

This will build the docker images that will be run:

`docker compose build`

This will run the two docker images and output all the outputs from both of them to the terminal:

`docker compose up`
