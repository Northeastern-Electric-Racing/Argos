#!/bin/sh

cargo prisma migrate deploy && exec /usr/src/myapp/target/release/scylla-server-rust