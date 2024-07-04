# Scylla Server (Go)

Scylla Server in Go.

## Dev

### Initial setup

You need go. [Go Install go](https://go.dev/doc/install).

You need dependencies:  
```
go mod tidy
```

Run the db:  
```
sudo docker compose run -P odyssey-timescale
```

Generate the client:  
```
go run github.com/steebchen/prisma-client-go generate
```

Run the app:
```
SOURCE_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/timescaledb go run .
```
### Testing

```
go test
```

### Prisma things

We use [prisma-client-go](https://github.com/steebchen/prisma-client-go).

To update the db live and generated new code:
```
go run github.com/steebchen/prisma-client-go db push
```

To just regenerated the client code:
```
go run github.com/steebchen/prisma-client-go generate
```



### Protobuf things

We use protobuf.  Install protoc.

To generate the serverdata run:
```
protoc -I=./protobuf/serverdata --go_out=./protobuf/ ./protobuf/serverdata/serverdata.proto
```


File structure

- main.go -> The entrypoint of the app
- prisma
  - db: the folder containing the prisma generated bindings to the database
  - migrations: the folder containing the prisma-managed migrations
  - prisma.go -> The wrapper around the PrismaClient API
  - schema.prisma ->  The prisma spec for the database
- protobuf
  - serverdata: contains generated serverdata protobuf API and spec file
    - serverdata.proto -> The protobuf spec file for the serverdata sent from calypso
- services: various services and their tests for interacting with the db


