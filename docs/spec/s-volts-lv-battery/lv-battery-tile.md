## Parent

#697

## What to build

An "LV Battery" voltage tile on the efuses page that shows the low-voltage battery's voltage and turns a warning color when the firmware's LV low-voltage fault is active.

The tile reads the LV battery voltage topic VCU/LV/voltage (volts), sits in the Caution Zone next to the existing LV eFuse card, and is a plain value readout in the existing style — not an eFuse card. It is labelled "LV Battery" to distinguish it from the LV eFuse card (VCU/eFuses/LV/Voltage). The warning color is driven by the firmware LV low-voltage fault flag, read as ordinary live data: firmware owns the threshold, so there is no hardcoded voltage threshold. Frontend-only — no scylla-server, Charybdis, or Siren change.

## Acceptance criteria

- [ ] An "LV Battery" tile appears on the efuses page near the LV eFuse card, styled like the other readouts and clearly distinct from the LV eFuse card.
- [ ] The tile shows VCU/LV/voltage in volts at sensible precision.
- [ ] The tile turns a warning color when the LV low-voltage fault flag is active and returns to normal when it clears.
- [ ] The warning is driven by the fault flag, not a hardcoded threshold.
- [ ] Tests drive the tile through its storage seam: publish a voltage and toggle the fault flag, asserting the value shown and the warning-color transitions.

## Blocked by

- None — can start immediately.

## Firmware note

The Odyssey definitions name the fault VCU/Faults/Non-Critical/LV_LOW_VOLTAGE_FAULT, but the local simulator publishes VCU/Faults/LV_LOW_VOLTAGE_FAULT (no Non-Critical segment). Confirm the string the car publishes and align the simulator so the warning is verifiable locally.
