#!/bin/sh
# Live selective-delivery benchmark (epic #991): brings up an offset scylla-dev
# stack (Mosquitto + Calypso's simulator over MQTT + Postgres), runs this
# branch's scylla-server in release, and runs live.mjs against it; then does
# the same against develop's published server image as the baseline, where
# every client gets every topic. See README.md.
#
#   scylla-server/benchmarks/run.sh            # from anywhere
#   SECS=60 BASELINE=none TEARDOWN=0 ./run.sh  # knobs, defaults below
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
SCYLLA="$HERE/.."
ROOT="$HERE/../.."

# offset 120 keeps clear of a default stack and of other offset stacks
export STACK_OFFSET="${STACK_OFFSET:-120}"
export ODYSSEY_DB_PORT="${ODYSSEY_DB_PORT:-5552}" ARGOS_DB_PORT="${ARGOS_DB_PORT:-5553}"
export SCYLLA_HOST_PORT="${SCYLLA_HOST_PORT:-8120}" CLIENT_HOST_PORT="${CLIENT_HOST_PORT:-200}"
export SIREN_MQTT_PORT="${SIREN_MQTT_PORT:-2003}" SIREN_WS_PORT="${SIREN_WS_PORT:-9122}"
export GRAFANA_HOST_PORT="${GRAFANA_HOST_PORT:-3120}"
ROOMS_PORT="${ROOMS_PORT:-8121}"
DEVELOP_PORT="${DEVELOP_PORT:-8122}"
DEVELOP_IMAGE="${DEVELOP_IMAGE:-ghcr.io/northeastern-electric-racing/argos-scylla:develop}"
BASELINE="${BASELINE:-image}" # image | none
TEARDOWN="${TEARDOWN:-1}"
WARMUP="${WARMUP:-5}"
SECS="${SECS:-30}"
OUT="$HERE/results/$(date +%Y%m%d-%H%M%S)"
DB_URL="postgresql://postgres:password@localhost:$ODYSSEY_DB_PORT/postgres"
DEVELOP_NAME="scylla-bench-develop-$STACK_OFFSET"

ROOMS_PID=""
cleanup() {
    [ -n "$ROOMS_PID" ] && kill -INT "$ROOMS_PID" 2>/dev/null && wait "$ROOMS_PID" 2>/dev/null || true
    docker rm -f "$DEVELOP_NAME" >/dev/null 2>&1 || true
    if [ "$TEARDOWN" = 1 ]; then
        (cd "$ROOT" && ./argos.sh scylla-dev down -v >/dev/null 2>&1) || true
    fi
}
trap cleanup EXIT INT TERM

wait_port() {
    for _ in $(seq 1 120); do
        curl -s -o /dev/null "http://localhost:$1/socket.io/?EIO=4&transport=polling" && return 0
        sleep 1
    done
    echo "server on :$1 did not come up" >&2
    return 1
}

live() { # label port pid clients
    node "$HERE/live.mjs" --url "http://localhost:$2" --label "$1" --server-pid "$3" \
        --clients "$4" --topics "$OUT/topics-sample.json" --warmup "$WARMUP" --secs "$SECS" \
        --out "$OUT/$1-$(echo "$4" | tr ',*' '_x').json" | tee -a "$OUT/summary.md"
    echo | tee -a "$OUT/summary.md"
}

mkdir -p "$OUT"
[ -d "$HERE/node_modules" ] || (cd "$HERE" && npm ci --no-audit --no-fund)

echo "== stack (offset $STACK_OFFSET)"
(cd "$ROOT" && ./argos.sh scylla-dev up -d siren calypso odyssey-db)
until docker exec "odyssey_scylla-dev_${STACK_OFFSET}-odyssey-db-1" pg_isready -q 2>/dev/null; do sleep 1; done

echo "== this branch's scylla-server (rooms), release, :$ROOMS_PORT"
(cd "$SCYLLA" && cargo build --release -q)
(cd "$SCYLLA" && DATABASE_URL="$DB_URL" RUST_LOG=warn exec ./target/release/scylla-server \
    -p "$ROOMS_PORT" -u "localhost:$SIREN_MQTT_PORT" >"$OUT/rooms-server.log" 2>&1) &
ROOMS_PID=$!
wait_port "$ROOMS_PORT"
sleep 5 # let the simulator's traffic reach the server

# the topic lists come from what an old client actually receives
node "$HERE/live.mjs" --url "http://localhost:$ROOMS_PORT" --sample-only --sample-secs 20 \
    --sample-out "$OUT/topics-sample.json" | tee -a "$OUT/summary.md"

live rooms "$ROOMS_PORT" "$ROOMS_PID" "old,bms,small,empty"
live rooms "$ROOMS_PORT" "$ROOMS_PID" "old*15"
live rooms "$ROOMS_PORT" "$ROOMS_PID" "small*15"
kill -INT "$ROOMS_PID"
wait "$ROOMS_PID" 2>/dev/null || true
ROOMS_PID=""

if [ "$BASELINE" = image ]; then
    echo "== develop's scylla-server ($DEVELOP_IMAGE), :$DEVELOP_PORT"
    docker run -d --rm --name "$DEVELOP_NAME" --network host -e DATABASE_URL="$DB_URL" -e RUST_LOG=warn \
        "$DEVELOP_IMAGE" -p "$DEVELOP_PORT" -u "localhost:$SIREN_MQTT_PORT" >/dev/null
    DEVELOP_PID=$(docker inspect --format '{{.State.Pid}}' "$DEVELOP_NAME")
    wait_port "$DEVELOP_PORT"
    sleep 5
    live develop "$DEVELOP_PORT" "$DEVELOP_PID" "old,bms,small,empty"
    live develop "$DEVELOP_PORT" "$DEVELOP_PID" "small*15"
fi

echo "results in $OUT"
