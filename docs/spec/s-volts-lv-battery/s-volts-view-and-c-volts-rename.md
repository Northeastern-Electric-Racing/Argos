## Parent

#697

## What to build

A new "S Volts" option on the BMS debug-page cell-voltage heatmap that shows each cell's S-ADC voltage exactly as the current view shows the C-ADC voltage, plus a rename of the current "Voltage" view to "C Volts" so the two ADC readings are unambiguous side by side.

S Volts covers both the Alpha and Beta chips across every segment, reuses the C Volts color scale and units, and shows the standard no-data grey where no S-ADC value has arrived. It appears in all three heatmap view selectors: the per-segment selector, the set-all selector, and the accumulator-overview per-row selector. The per-cell topic is BMS/PerCell/{Alpha|Beta}/{segment}/S_Volts/{cell}.

The rename is label-and-view-model only: it must not change the underlying Volts topic, the stored data, or the color logic. Frontend-only — telemetry ingest is schemaless, so no scylla-server, Charybdis, or Siren change.

## Acceptance criteria

- [ ] "S Volts" is selectable in all three heatmap selectors (per-segment, set-all, accumulator-overview per-row).
- [ ] S Volts renders each cell's S-ADC voltage for both Alpha and Beta across every segment, using the same color scale and units as C Volts.
- [ ] Cells with no S-ADC value render the standard no-data grey.
- [ ] The current "Voltage" view is relabeled "C Volts", with no change to its topic, stored data, or color.
- [ ] Tests drive the heatmap through its storage seam and assert rendered value and color for both S Volts and C Volts, plus grey for undefined cells.

## Blocked by

- None — can start immediately.

## Firmware note

The S_Volts per-cell topic is not yet in the Odyssey definitions (firmware spec in progress). Confirm the exact topic string before merge — a mismatch renders every S Volts tile grey. Until firmware publishes it, tiles stay grey against real data and are exercised with simulated/unit data.
