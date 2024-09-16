# Scylla Server

The express backend for Argos. Handles storing Telemetry data from MQTT into a TimeScaleDB running on the router and forwarding the data to both of the frontends (argos-ios and angular-client).

## Local Development

IMPORTANT - Before doing anything make sure you've run:

`git submodule update --init`

Make sure you're in the `scylla-server` directory.

Create a file named .env in the scylla-server directory with the following content for local development:
```
SOURCE_DATABASE_URL="postgresql://postgres:password@localhost:5432/timescaledb"
```

Note: If connecting to MQTT, set PROD=true in your .env variabe and add the PROD_SIREN_HOST_URL to your .env file as well, this is the host name for connecting to the mqtt server. 

To install dependencies run:

`npm install`

To setup the database in docker run: 

`docker-compose up -d odyssey-timescale`

Then:

`npm run prisma:generate`

`npm run prisma:migrate`

Then to actually run the server in development mode, run:

`npm start`


The server will be exposed on `http://localhost:8000/`. If you have the client running, you should see message about connecting to a socket. Once you see that, you're all setup!
