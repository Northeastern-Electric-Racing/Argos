---
name: verify-graph
description: Playwright MCP verification of the graph page — modes, controls, topic selection, and data rendering. Use after any change to graph-page components, graph rendering, data flow, or mode switching logic.
user-invocable: true
---

## Prerequisites

1. **Local app running.** Check for an Angular instance on ports 4200-4210 AND the backend on `:8000`. If either is missing, run `/run-local` first — it brings up the right compose profile (`client-dev` for frontend-only changes, `scylla-dev` + `cargo run` when scylla-server changed).
2. **Historical runs must exist with data** — graph views need real backend data to render anything meaningful.

Detect the port:
`!lsof -i :4200-4210 -sTCP:LISTEN 2>/dev/null | grep LISTEN | head -1`

Set `BASE_URL` = `http://localhost:<detected-port>`.

## Playwright MCP Workflow

Use these tools in this pattern for each test:

```
browser_navigate -> browser_snapshot (assert DOM state) -> browser_click / browser_run_code (interact) -> browser_take_screenshot (visual proof)
```

Create the screenshots directory first:
`!mkdir -p pictures/<branch>/verify-graph`

### PrimeNG Dialog Workaround

The "Select this Run" button in the run carousel is blocked by a PrimeNG overlay. Always use `browser_run_code` for this:

```js
async (page) => {
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent?.includes('Select this Run'));
    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(2000);
}
```

### Topic Selection Helper

To select a leaf topic (tree click navigates to page instead), use `browser_run_code`:

```js
async (page) => {
  // Click a specific leaf topic by name
  await page.evaluate((topicName) => {
    const p = Array.from(document.querySelectorAll('p'))
      .find(el => el.textContent?.trim() === topicName);
    if (p) p.click();
  }, 'Voltage');
  await page.waitForTimeout(3000);
}
```

---

## Test Checklist

Run all 7 groups sequentially. Stop and fix if any group fails.

### 1. Real-time baseline

- `browser_navigate` to `{BASE_URL}/graph`
- `browser_snapshot`: assert the following
  - Text "Real Time" present in right header
  - Buttons visible: "Pause", "Time Range", "Select Run", "Clear Graph"
  - Text "X (sec):" with spinbutton present
  - "Y Min:" and "Y Max:" spinbuttons present
  - Combobox "Select Range" present
  - Button "Realtime" is NOT present (only shown in historical mode)
- `browser_take_screenshot` -> `pictures/<branch>/verify-graph/01-rt-baseline.png`

### 2. Topic selection + data

- `browser_snapshot` to find the BMS tree expand button (look for `treeitem "BMS"` > `button` ref)
- `browser_click` the BMS expand button by ref
- `browser_snapshot` to find Pack expand button
- `browser_click` the Pack expand button by ref
- `browser_run_code` with the Topic Selection Helper to click "Voltage"
- Wait 3s for data to load
- `browser_snapshot`: assert URL contains `?topics=BMS/Pack/Voltage`
- `browser_take_screenshot` -> `pictures/<branch>/verify-graph/02-topic-selected.png`
- Verify: chart shows a data series (line visible in screenshot)

### 3. Real-time controls

**Pause/Play:**
- `browser_click` button "Pause"
- `browser_snapshot`: assert button now shows "Play"
- `browser_click` button "Play"
- `browser_snapshot`: assert button shows "Pause" again

**Time Range / Point Range:**
- `browser_click` button "Time Range"
- `browser_snapshot`: assert button shows "Point Range", label shows "X (points):"
- `browser_click` button "Point Range"
- `browser_snapshot`: assert reverted to "Time Range" + "X (sec):"

**Sidebar toggle:**
- `browser_click` button "Tog Sidebar"
- `browser_take_screenshot` -> `pictures/<branch>/verify-graph/03-sidebar-hidden.png` (sidebar should be gone)
- `browser_click` button "Tog Sidebar"
- `browser_take_screenshot` -> `pictures/<branch>/verify-graph/03-sidebar-visible.png` (sidebar back)

### 4. Historical Run mode

- `browser_click` button "Select Run"
- `browser_run_code` with the PrimeNG Dialog Workaround to click "Select this Run"
- `browser_snapshot`: assert the following
  - Text matching "Run #" in right header (not "Real Time")
  - Button "Realtime" IS present
  - Button "Pause" is NOT present
  - Button "Time Range" / text "X (sec):" is NOT present
  - "Y Min:" and "Y Max:" still present
- Topic should still be selected from step 2 — wait 3s for historical data
- `browser_take_screenshot` -> `pictures/<branch>/verify-graph/04-hist-run.png`
- Verify: x-axis on chart spans MORE than 30 seconds (check axis labels in screenshot)

### 5. Historical Time Range mode

- `browser_click` button "Realtime" (return to RT first)
- `browser_snapshot`: confirm "Real Time" header
- `browser_snapshot` to find the Select Range dropdown ref
- `browser_click` the Select Range combobox/container by ref
- `browser_snapshot`: assert listbox has all 7 options: "1 minute", "2 minutes", "5 minutes", "10 minutes", "15 minutes", "30 minutes", "1 hour"
- `browser_click` option "5 minutes" by ref
- `browser_snapshot`: assert the following
  - Text "Hist Range" in right header
  - Button "Realtime" IS present
  - Button "Pause" is NOT present
  - Combobox shows "5 minutes" selected
- Wait 3s for data
- `browser_take_screenshot` -> `pictures/<branch>/verify-graph/05-hist-range-5min.png`
- Verify: x-axis spans approximately 5 minutes (NOT 30 seconds)

### 6. Mode switching cycle

Run through all transitions, snapshot after each:

1. `browser_click` "Realtime" -> `browser_snapshot`: header = "Real Time", RT controls back
2. `browser_click` "Select Run" -> PrimeNG workaround -> `browser_snapshot`: header = "Run #N"
3. `browser_click` "Realtime" -> `browser_snapshot`: header = "Real Time"
4. Open dropdown, click "1 minute" -> `browser_snapshot`: header = "Hist Range"
5. `browser_click` "Realtime" -> `browser_snapshot`: header = "Real Time"

- `browser_take_screenshot` -> `pictures/<branch>/verify-graph/06-mode-cycle-final.png`
- Verify: no console errors from mode switching (check `browser_console_messages` if needed)

### 7. Regression: RT range constraint

- Should be in RT mode from step 6. If topic is cleared, re-select one.
- Wait 10 seconds for real-time data to accumulate
- `browser_take_screenshot` -> `pictures/<branch>/verify-graph/07-rt-range-check.png`
- Verify: x-axis shows approximately 30 seconds of data (the default range), NOT the full session duration
- This confirms the historical auto-fit behavior does NOT leak into real-time mode

---

## Output

Report as a markdown checklist with screenshot links:

```
## Graph Verification Results — <branch>

- [x] RT baseline — controls correct
- [x] Topic selection — data loads, URL syncs
- [x] RT controls — pause, range toggle, sidebar work
- [x] Historical Run — mode switches, x-axis auto-fits
- [x] Historical Range — dropdown works, x-axis auto-fits
- [x] Mode switching — all transitions clean
- [x] Regression — RT range constraint preserved

Screenshots: `pictures/<branch>/verify-graph/`
```

Mark any failed group with `[ ]` and describe the failure.
