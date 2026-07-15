---
name: run-local
description: Bring up the local Argos environment for running or testing — Docker backend (right profile for what changed) + Angular client on the next free port. Use whenever you need to actually run the app locally, not just start the frontend.
allowed-tools: Bash(lsof:*), Bash(npx ng serve:*), Bash(curl:*), Bash(sleep:*), Bash(pkill:*), Bash(tail:*), Bash(timeout:*), Bash(docker ps:*), Bash(./argos.sh:*)
user-invocable: true
---

## Context

Current directory:
`!pwd`

Running Angular instances:
`!lsof -i :4200-4210 -sTCP:LISTEN 2>/dev/null | grep LISTEN || echo "None"`

Docker backend status (scylla-server on :8000/8010/.../8090, one per STACK_OFFSET):
`!for p in 8000 8010 8020 8030 8040 8050 8060 8070 8080 8090; do if lsof -nP -i :$p -sTCP:LISTEN 2>/dev/null | grep -q LISTEN; then c=$(docker ps --filter "publish=$p" --format '{{.Names}}' | head -1); echo "  :$p UP (${c:-host listener, likely cargo run})"; fi; done | grep . || echo "Backend DOWN (no listeners in 8000..8090 step 10)"`
`!docker ps --format '{{.Names}}\t{{.Ports}}' 2>/dev/null | grep -E '(scylla|mosquitto|db|calypso)' | sort || echo "No Argos containers running"`

## Task

Start the Angular dev client on the next available port — and make sure the backend is running, because `ng serve` alone is a silent false negative for UI verification. The few lines this skill adds to runtime cost save hours of chasing "my fix works" when it actually doesn't.

**Ports are not fixed — never assume 8000/4200.** The backend lands on `:$((8000 + 10*STACK_OFFSET))` (default stack `:8000`, parallel stacks shift by 10 — see `compose/README.md`), and the client takes the first free port in `4200–4210`. Always read the actual port from the Context scan above and carry it into every `curl`/`ng serve` you run.

### Step 1: Confirm the backend is up (and on the right profile)

Check the scan from the Context block (ports 8000/8010/.../8090) AND `docker ps`. If no backend is listening anywhere in that range, stop and ask the user to bring one up. If at least one is up, read its port and project name straight from the scan (`odyssey_<profile>` = default stack on :8000; `odyssey_<profile>_N` = a parallel stack, conventionally on `:$((8000+N))` per the `compose/README.md` recipe — but trust the scan, not the suffix) and confirm:

- **Frontend-only changes** → the Docker'd backend is fine. Profile: `./argos.sh client-dev up` (runs scylla-server inside Docker).
- **Changes to `scylla-server/`** → the Docker'd scylla-server is stale. They need `./argos.sh scylla-dev up` (brings up everything EXCEPT scylla-server) and then `cd scylla-server && cargo run` in a separate terminal so their local build is exercised. If you see Docker running scylla-server but your checkout has scylla-server changes, flag it — their UI test will hit the wrong binary.

If the chosen scylla isn't on `:8000`, surface that explicitly in your summary so the user knows which port their `ng serve` and any curl examples need to point at. Use the port shown by the scan, not a value computed from the suffix.

If the backend is DOWN, do one of:

- Suggest the user run `! ./argos.sh client-dev up` (or `scylla-dev` per above) so output streams into the conversation. To run a parallel stack alongside an existing one, see the `env STACK_OFFSET=N ... ./argos.sh ...` recipe in `compose/README.md`.
- If they've authorized container starts in this session, run `./argos.sh <profile> up -d` yourself and wait for `scylla-server` to be reachable on its port — `:8000` for the default stack, `:$((8000 + 10*STACK_OFFSET))` for a parallel one — before continuing (`curl -s http://localhost:<port>/datatypes`).

The only exception: pure static/style changes with no server-driven content in the affected component tree. In that case, note in your final summary that only layout was verified — no data was exercised.

Do NOT proceed to Step 2 silently when the backend is down and the change needs it.

### Step 2: Find `angular-client/`
Resolve the path from the current working directory. If already inside `angular-client/`, use `.`. Otherwise look for it relative to the repo root.

### Step 3: Find a free port
Starting from 4200, check each port with `lsof -i :<port> -sTCP:LISTEN`. Use the first port with no listener. Cap at 4210.

If a server is already running for this repo's `angular-client/`, report that port instead of starting a new one.

### Step 4: Start the server
Run in background, capturing output to a temp log file:
```bash
cd <angular-client-path> && npx ng serve --port <port> > /tmp/ng-serve-<port>.log 2>&1 &
```

### Step 5: Wait for readiness
Do NOT poll with `curl` on short intervals — the first compile takes ~10-60s and curl returns connection refused until then.

Tail the log file and wait for the build-complete signal:
```bash
timeout 120 tail -f /tmp/ng-serve-<port>.log | grep -m1 -E "(Compiled successfully|Local:.*localhost)"
```
This blocks until the build finishes or times out at 120s. Reliable — no false negatives.

### Step 6: Confirm and report
Verify with `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>` to confirm 200.

Report: **Dev client ready at http://localhost:<port>** — and explicitly state whether the Docker backend is UP or DOWN, so the user knows whether dynamic UI will actually render.
