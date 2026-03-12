#!/bin/sh

profile=$1
shift 1
cd ./compose
docker compose -f compose.yml -f "compose.$profile.yml" -p "odyssey_$profile" "$@"
