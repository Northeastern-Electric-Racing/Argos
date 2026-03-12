# Argos Compose Profiles System

## Quick start

### argos.sh

The `argos.sh` (from the root directory) can be used on `sh` OSes to quickly get up and running.  
Its syntax is 
```
./argos.sh <profile> <docker cmd>
```
 where profile could be one of the below profiles (see the table), or client-dev and the cmd is the normal argument passed into docker compose, such as `up -d` to start the process and fork to background.  **Make sure to `down` with the same profile that you used `up` with!**

### Profiles & your own setup

Profiles:
| Name         | Usecase                                                 | Scylla                                    | Siren                   | Client                                    | Database |
| ------------ | ------------------------------------------------------- | ----------------------------------------- | ----------------------- | ----------------------------------------- | -------- |
| `brick`      | Device connected to base station to collect data        | No rate limit                             | On base station         | External (`router`)                       | Active   |
| `router`     | The base station collecting on a rate limit and hosting | Rate limited                              | Active, bridging to car | Active                                    | Active   |
| `tpu`        | The on-car data collection node                         | Rate limited                              | External (TPU OS)       | None                                      | Active   |
| `client-dev` | To develop the client with a working backend            | Rate limited                              | Active                  | None (run your own pointing to localhost) | Active   |
| `scylla-dev` | To develop scylla with a working frontend               | None (run your own pointing to localhost) | Active                  | Active localhost (**MUST BUILD FIRST**)   | Active   |


The base docker compose (`compose.yml`) contains some important features to note.  However, it is useless standalone.  Please read the profile customization selection below before using the base compose.
- It persists the database between `down` commands via a volume called `argos_db-data`.  Delete it with `docker volume rm argos_db-data` to start with a new database next `up`.
- It weighs the CPU usage of siren higher, so it is prioritized in CPU starvation scenarios.


*These profiles are non-exhuastive, there are plently of use cases these profiles do not cover.  In that case, you can write your own profile to cover it.*

#### Examples with and without profiles

- To send some simulated data to a client you are running with `npm`: `./argos.sh client-dev up`
- To start a mqtt server with simulated data you want to send to an instance of scylla running through `cargo`: `docker compose -f ./siren-base/compose.siren.yml -f ./compose/compose.calypso.yml up`


#### Customizing runtime profiles of the project via docker compose

This project uses docker compose overrides to secify configurations.  Therefore there are multiple "profiles" to choose from when running in production, and there are some profiles for development testing.  Also, there are fragment files for siren and client in `siren-base` and `angular-client` respectively, as they are services only used in certain cases.  These profiles are specified via the command line on top of the base `compose.yml` file as follows.

```
docker compose -f compose.yml -f <override_file_name> <your command here>
```

Additionally if you need to create your own options, you can create a `compose.override.yml` file in this directory and specify what settings should be changed, which is ignored by git.  If you think the override would become useful, document it here and name it `compose.<name>.yml`.

Examples:

Router deploy and send to background: `docker compose -f compose.yml -f compose.router.yml up -d`

#### Build and deploy

Using the above profiles, one can `build` the app.  Then, with correct permissions, you can `push` the app then `pull` it elsewhere for usage.  Note that you must `push` and `pull` on the same architecture, so you cannot use for example a dell laptop to build for the router!  To get `push` permissions, create a PAT [here](https://github.com/settings/tokens/new?scopes=write:packages) and copy the token into this command:

```
sudo docker login ghcr.io -u <gh username> -p <token>
```

Now you can update the image on a remote server.  Note to save time you can just specify which service to upload, like `scylla-server` or `client`.
```
sudo docker compose -f compose.yml -f compose.router.yml build && sudo docker compose -f compose.yml -f compose.router.yml push