# Spec: S Volts cell-voltage heatmap view + LV battery tile

Tracking issue: #697. Domain vocabulary for this spec (C-ADC voltage / S-ADC voltage / CvS) is added to `CONTEXT.md` in the same change.

## Problem Statement

BMS engineers watch each cell's voltage on the per-cell heatmap of the BMS debug page, but only the **C-ADC** reading is shown (the view is labelled "Voltage"). The ADBMS chip also measures every cell independently on its redundant **S-ADC**. Today there is no way to see those S-ADC values in Argos — so when the existing CvS Failure view flags that a cell's C-ADC and S-ADC diverged, an engineer cannot see the actual S-ADC voltage to diagnose why.

Separately, the efuses page shows an "LV" eFuse card (the electronic fuse on the low-voltage rail), but nothing shows the **LV battery**'s own voltage. There is no at-a-glance read of low-voltage battery health, and no visible warning when it sags.

## Solution

Add an **S Volts** view to the cell-voltage heatmap that shows each cell's S-ADC voltage exactly the way the current view shows the C-ADC voltage, and rename the current view from "Voltage" to **C Volts** so the two ADC readings are unambiguous side by side. The two views share one color scale, so an engineer can flip between them and compare at a glance.

Add an **LV Battery** voltage tile to the efuses page — visually a plain value readout in the existing style, placed near the LV eFuse card but clearly distinct from it — that shows the LV battery voltage and turns a warning color when the firmware's low-voltage fault is active.

Both are frontend-only: telemetry ingest is schemaless (a Topic maps one-to-one onto a DataType keyed by its name), so the new streams flow through the existing pipeline with no scylla-server, Charybdis, or Siren change.

## User Stories

1. As a BMS engineer, I want an "S Volts" option on the cell-voltage heatmap, so that I can see each cell's S-ADC voltage.
2. As a BMS engineer, I want the current "Voltage" view renamed "C Volts", so that it is unambiguous which ADC I am looking at now that both are shown.
3. As a BMS engineer, I want S Volts to use the same color scale and units as C Volts, so that I can compare the two views without recalibrating my eye.
4. As a BMS engineer, I want the S Volts view to cover both the Alpha and Beta chips across every segment, so that its coverage matches C Volts exactly.
5. As a BMS engineer, I want each S Volts tile to show the numeric voltage with the same precision as C Volts, so that I can read exact values.
6. As a BMS engineer, I want cells with no S-ADC data yet to render as the standard "no data" grey, so that missing data is obvious rather than misleading.
7. As a BMS engineer, I want to switch a single segment to the S Volts view, so that I can focus on one segment's S-ADC readings.
8. As a BMS engineer, I want to set every segment to S Volts at once, so that I can scan the whole pack's S-ADC readings quickly.
9. As a BMS engineer, I want S Volts in the accumulator-overview (per-row) selector too, so that I can see S-ADC on the overview, not just the per-segment view.
10. As a BMS engineer, when the CvS Failure view flags a cell, I want to flip to S Volts and C Volts, so that I can see both readings behind the divergence.
11. As a pit engineer, I want an LV battery voltage tile on the efuses page, so that I can monitor the low-voltage battery at a glance during a session.
12. As a pit engineer, I want the LV battery tile visually distinct from the LV eFuse card and clearly labelled "LV Battery", so that I never confuse the battery reading with the fuse reading.
13. As a pit engineer, I want the LV battery tile near the LV eFuse card, so that related low-voltage-rail information is grouped together.
14. As a pit engineer, I want the tile styled like the other efuse readouts, so that the page stays visually consistent.
15. As a pit engineer, I want the LV battery value shown in volts at sensible precision, so that I can read it accurately.
16. As a pit engineer, I want the LV battery tile to turn a warning color when the firmware raises the LV low-voltage fault, so that I am alerted to a sagging LV battery without memorising a threshold.
17. As a developer, I want the low-voltage warning driven by the firmware fault flag rather than a hardcoded threshold, so that the alert stays correct when firmware changes the threshold.
18. As a developer, I want S Volts and LV battery to require no backend, schema, or broker changes, so that the work is frontend-only and low-risk.
19. As a developer, I want the new per-cell S Volts topics to appear the moment firmware publishes them, so that no further Argos change is needed once the firmware ships.
20. As a BMS engineer, I want S Volts and LV battery to show up on the graph page automatically as selectable topics, so that I can graph them historically without extra work.
21. As a developer, I want the hardcoded S Volts topic string to match the firmware contract exactly, so that tiles are not silently grey.
22. As a BMS engineer, I do not want the C Volts rename to change any topic, stored data, or color — only the label — so that historical data and muscle memory are unaffected.

## Implementation Decisions

### Shared

- No scylla-server, Charybdis, or Siren changes. Ingest is dynamic: a Topic string becomes a DataType by name, so new per-cell and LV streams persist, rebroadcast live, and appear under the datatypes list automatically. All work is in angular-client.

### S Volts view + C Volts rename

- Add a new value to the heatmap view model (the `HeatMapView` enum) for the S-ADC reading, displayed as "S Volts". Rename the existing member's display label from "Voltage" to "C Volts"; rename the member itself to pair with the new one for symmetry. The rename touches only the label and the view model — not the underlying `Volts` Topic, stored DataType, or color logic.
- Extend the per-cell reading model with an S-ADC voltage field, populated exactly like the existing C-ADC voltage field: for each segment and each cell index on both Alpha and Beta chips, subscribe to the S Volts per-cell Topic and write the parsed float into that cell. The per-cell counts mirror the existing voltage counts (all segments, all cells, both chips).
- Add per-cell S Volts Topic builders mirroring the existing per-cell voltage builders, under `BMS/PerCell/{Alpha|Beta}/{segment}/S_Volts/{cell}`.
- The heatmap tile's value/color selection dispatches the S Volts view to the S-ADC field and **reuses the existing cell-voltage color scale unchanged** (S-ADC measures the same cells over the same range). The tile's view-to-unit and view-to-class lookup maps gain the new view (volts, same as C Volts); these maps are keyed by the view model and will not compile until updated — an intended compile-time guard.
- The new view is added to all three view selectors — the per-segment selector, the set-all selector, and the accumulator-overview per-row selector — so it appears everywhere the other views do.
- **Firmware contract (assumed).** The per-cell S Volts Topic string is treated as `.../S_Volts/{cell}` for cells across the existing voltage range. This is not yet in the Odyssey definitions (the firmware spec is in progress); confirm the exact string and per-cell indexing with the firmware owner before merge, since a mismatch renders every S Volts tile grey.

### LV battery tile

- Add a value tile to the efuses page reading the LV battery voltage Topic `VCU/LV/voltage` (volts), placed in the Caution Zone adjacent to the existing LV eFuse card. It is a plain readout in the existing seven-segment style, not an eFuse card, and is labelled "LV Battery" to distinguish it from the LV eFuse (`VCU/eFuses/LV/Voltage`).
- The tile's warning color is driven by the firmware's LV low-voltage fault flag (a boolean DataType), read as ordinary live data — firmware owns the threshold, the tile only reflects the flag. No hardcoded voltage threshold.
- **Fault Topic caveat.** The Odyssey definitions name this fault `VCU/Faults/Non-Critical/LV_LOW_VOLTAGE_FAULT`, but the local simulator currently publishes `VCU/Faults/LV_LOW_VOLTAGE_FAULT` (no `Non-Critical/` segment). Confirm the string the real car publishes, and align the simulator so the warning can be verified locally.

## Testing Decisions

- Good tests here assert **external behavior** — what renders for a given stream of telemetry — not internal wiring. Drive each component through the one seam it already has (its injected storage) and assert the rendered value and color, not private methods or field names.
- **S Volts + C Volts (one seam).** Exercise the heatmap through the storage injection seam with the real per-cell reading service and the real heatmap component: publish S Volts and C-ADC values for known cells via a fake storage, then assert the rendered tiles show the right value and color for the "S Volts" and "C Volts" views, and that undefined cells render grey. This single high seam covers Topic building, per-cell mapping, view/value/color dispatch, the rename, and the tile lookup maps together. Prior art: the existing BMS debug-page component specs and the service specs (e.g. the topic-selection service spec's fake-data pattern).
- **LV battery tile (one seam).** Exercise the tile through its storage seam: publish an LV battery voltage and toggle the low-voltage fault flag, then assert the tile shows the value and switches to the warning color when the flag is set and back when it clears. Prior art: the info-value-display and connection-dot-with-message component specs.
- No backend tests — there is no backend change.

## Out of Scope

- **Open Wire per-cell heatmap view.** Requested alongside this work but deferred: the per-cell `OW` Topic is not in the Odyssey definitions and its payload shape (a 0/1 flag versus a per-cell value) is unresolved, which decides whether it is a boolean view like CvS or a numeric view like the voltages. It becomes its own spec once firmware pins the payload.
- Any scylla-server, Charybdis, or Siren change.
- Building dedicated graph-page UI for the new streams — they appear there automatically via the datatypes list; no work required, so none is planned here.
- Other per-cell ADBMS fields present in the definitions (die temperature, reference/analog/digital rails, per-chip fault bits) — not requested, not included.

## Further Notes

- **Data availability.** The LV battery Topic is already in the definitions and live in the local simulator, so the LV battery tile is buildable and verifiable end-to-end now. S Volts is build-ahead-of-firmware: its type is unambiguous (a per-cell float voltage mirroring the C-ADC), but live verification waits on firmware publishing the Topic; until then S Volts tiles render grey against real data and are exercised via simulated/unit data.
- **Why the C-ADC/S-ADC split matters.** The chip's two independent ADCs are the basis of the existing CvS fault ("the C and S ADCs read too different"). Surfacing S Volts next to C Volts turns that fault from a bare flag into something diagnosable. The glossary entries added to `CONTEXT.md` record this vocabulary.
- **Slicing.** This spec is expected to break into two independent implementation tickets — the S Volts view plus C Volts rename, and the LV battery tile — with the deferred Open Wire view tracked separately. `to-tickets` will do that slicing.
