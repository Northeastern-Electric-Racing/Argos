---
name: verify-telemetry
description: Verification checklist for changes to MQTT-displayed telemetry values in the Angular frontend. Use whenever modifying, adding, or debugging a value that flows from the car through MQTT to the UI — including display formatting, new subscriptions, missing data, or incorrect readings.
---

## Verify Telemetry Value Changes

Run through each step in order. Stop and fix if any step fails.

### 1. Trace the subscription

Starting from the component displaying the value, verify the full chain:

- Component property (e.g. `voltage: number`) is updated via `this.storage.get(topics.someTopicFn())` subscription
- The topic function in `src/utils/topic.utils.ts` returns the correct MQTT topic string
- The value is parsed correctly (`parseInt` vs `parseFloat`) for the data type

If the subscription is missing, that's the bug — add it before continuing.

### 2. Match against CAN definitions

Always clone the firmware definitions repo locally into a `.context/` folder at the repo root (gitignored), so the CAN JSON is available offline:

```bash
git clone https://github.com/Northeastern-Electric-Racing/Odyssey-Definitions.git .context/Odyssey-Definitions
```

Then open the corresponding JSON under `.context/Odyssey-Definitions/can-messages/`. Files: `bms.json`, `dti.json`, `vcu.json`, `charger.json`, etc.

Confirm the topic string from step 1 exactly matches a `"name"` field in the CAN definition. Check the `"unit"` and `"values"` array index too.

### 3. Check calypso simulator

```bash
docker pull ghcr.io/northeastern-electric-racing/calypso:Develop
docker ps --filter "name=calypso"
```

If the image updated, restart the containers (`argos.sh client-dev down && argos.sh client-dev up`).

### 4. Verify message delivery

Check scylla-server logs for the topic:
```bash
docker logs scylla-server 2>&1 | grep "<TOPIC_STRING>" | tail -5
```

If no logs appear, the message isn't being published — check calypso and the CAN definition.

### 5. Run the app and verify visually

```bash
# Start backend + infra (if not already running)
./argos.sh client-dev up

# Start Angular dev server
cd angular-client && npm install && npm start
```

Navigate to the relevant page with Playwright, wait for data, and take a screenshot:
```
pictures/<branch-name>/<descriptive-name>.png
```

Confirm the value displays correctly with live data, proper formatting, and no layout issues.
