#!/bin/sh

profile=$1
shift 1

# STACK_OFFSET=N shifts every published host port by N and suffixes the
# compose project name with _oN so a second dev stack runs alongside the
# first with zero collisions. Unset or 0 = byte-identical to today.
project="odyssey_$profile"
if [ -n "$STACK_OFFSET" ] && [ "$STACK_OFFSET" != "0" ]; then
    export ODYSSEY_DB_PORT=$((5432 + STACK_OFFSET))
    export SCYLLA_HOST_PORT=$((8000 + STACK_OFFSET))
    export CLIENT_HOST_PORT=$((80 + STACK_OFFSET))
    export SIREN_MQTT_PORT=$((1883 + STACK_OFFSET))
    export SIREN_WS_PORT=$((9002 + STACK_OFFSET))
    export GRAFANA_HOST_PORT=$((3002 + STACK_OFFSET))
    project="${project}_o${STACK_OFFSET}"
fi

cd ./compose
docker compose -f compose.yml -f "compose.$profile.yml" -p "$project" "$@"
