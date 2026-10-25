import { computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, merge, scan } from 'rxjs';
import { EFUSE_TOPICS } from 'src/pages/efuses-page/efuses-page.topics';
import { QuickViewReadout, QuickViewStatus } from 'src/services/quick-view.service';
import Storage from 'src/services/storage.service';
import { getCellChipLabel, getChipFromTopicValue } from 'src/utils/bms.utils';
import { topics } from 'src/utils/topic.utils';

/*
 * Ready-made quick-view readouts, shared so the same reading looks the same on every page.
 * Every factory reads live topics with toSignal, so call it from the registering page's or
 * component's injection context: its subscriptions then end when that owner is destroyed, along
 * with its registration.
 */

const OK = 'var(--color-battery-high)';
const FAULT = 'var(--color-battery-low)';

/** Latest value of a numeric topic, undefined until it first publishes. */
export const topicNumber = (topic: string): Signal<number | undefined> =>
  toSignal(
    inject(Storage)
      .get(topic)
      .pipe(map((v) => parseFloat(v.values[0])))
  );

type FaultTopic = { name: string; topic: string };

/** Names of the listed faults whose flag is currently raised, earliest raised first. */
export const activeFaults = (faults: readonly FaultTopic[]): Signal<string[]> => {
  const storage = inject(Storage);
  const flags = merge(
    ...faults.map(({ name, topic }) => storage.get(topic).pipe(map((v) => [name, Number(v.values[0]) !== 0] as const)))
  );
  return toSignal(
    flags.pipe(
      // A Set keeps insertion order, so the fault raised first stays first while it lasts.
      scan((active, [name, raised]) => {
        if (raised === active.has(name)) return active;
        const next = new Set(active);
        if (raised) next.add(name);
        else next.delete(name);
        return next;
      }, new Set<string>()),
      map((active) => [...active])
    ),
    { initialValue: [] }
  );
};

/** "None", or the first active fault plus how many more, with a labelled dot. */
const faultReadout = (label: string, noun: string, faults: readonly FaultTopic[]): QuickViewReadout => {
  const active = activeFaults(faults);
  return {
    label,
    icon: 'warning',
    value: computed(() => {
      const [first, ...rest] = active();
      if (!first) return 'None';
      return rest.length ? `${first} +${rest.length}` : first;
    }),
    status: computed<QuickViewStatus>(() =>
      active().length
        ? { color: FAULT, label: `${noun} fault active` }
        : { color: OK, label: `No ${noun.toLowerCase()} fault` }
    )
  };
};

export const stateOfChargeReadout = (): QuickViewReadout => {
  const fraction = topicNumber(topics.stateOfCharge());
  return {
    label: 'State of Charge',
    icon: 'battery',
    // Published as a 0–1 fraction.
    value: computed(() => {
      const soc = fraction();
      return soc === undefined ? undefined : soc * 100;
    }),
    unit: '%'
  };
};

export const packVoltageReadout = (): QuickViewReadout => ({
  label: 'Pack Voltage',
  icon: 'bolt',
  value: topicNumber(topics.packVoltage()),
  unit: 'V',
  decimals: 1
});

export const chargingCurrentReadout = (): QuickViewReadout => ({
  label: 'Charging Current',
  icon: 'electric_meter',
  value: topicNumber(topics.current()),
  unit: 'A',
  decimals: 1
});

/** BMS/Status/State values, as the Charging page's BMS mode display names them. */
const BMS_STATES: Record<number, { name: string; color: string }> = {
  0: { name: 'DEFAULT', color: 'grey' },
  1: { name: 'READY', color: '#3b82f6' },
  2: { name: 'CHARGING', color: OK },
  3: { name: 'FAULTED', color: FAULT }
};

export const bmsStateReadout = (): QuickViewReadout => {
  const state = topicNumber(topics.bmsMode());
  const known = computed(() => BMS_STATES[state() ?? -1]);
  return {
    label: 'BMS State',
    icon: 'model_training',
    value: computed(() => known()?.name),
    status: computed(() => {
      const current = known();
      return current && { color: current.color, label: `BMS ${current.name.toLowerCase()}` };
    })
  };
};

export const balancingReadout = (): QuickViewReadout => {
  const balancing = topicNumber(topics.statusBalancing());
  return {
    label: 'Balancing',
    icon: 'electrical_services',
    value: computed(() => (balancing() === undefined ? undefined : balancing() === 1 ? 'Yes' : 'No'))
  };
};

/** Highest minus lowest cell voltage. */
export const cellSpreadReadout = (): QuickViewReadout => {
  const high = topicNumber(topics.highVoltsValue());
  const low = topicNumber(topics.lowVoltsValue());
  return {
    label: 'Cell Spread',
    icon: 'bar_chart',
    value: computed(() => {
      const h = high();
      const l = low();
      return h === undefined || l === undefined ? undefined : (h - l) * 1000;
    }),
    unit: 'mV',
    detail: computed(() => {
      const h = high();
      const l = low();
      return h === undefined || l === undefined ? undefined : `${l.toFixed(3)}–${h.toFixed(3)} V`;
    })
  };
};

/** A cell extreme with where it is, located the way the BMS at-a-glance labels it. */
const locatedCellReadout = (
  label: string,
  icon: string,
  unit: string,
  decimals: number,
  valueTopic: string,
  cellTopic: string,
  chipTopic: string
): QuickViewReadout => {
  const cell = topicNumber(cellTopic);
  const chip = topicNumber(chipTopic);
  return {
    label,
    icon,
    value: topicNumber(valueTopic),
    unit,
    decimals,
    detail: computed(() => {
      const chipValue = chip();
      return getCellChipLabel(cell(), chipValue === undefined ? undefined : getChipFromTopicValue(chipValue));
    })
  };
};

export const highCellVoltReadout = (): QuickViewReadout =>
  locatedCellReadout(
    'High Cell',
    'battery_charging_full',
    'V',
    3,
    topics.highVoltsValue(),
    topics.highVoltsCell(),
    topics.highVoltsChip()
  );

export const lowCellVoltReadout = (): QuickViewReadout =>
  locatedCellReadout(
    'Low Cell',
    'battery_charging_full',
    'V',
    3,
    topics.lowVoltsValue(),
    topics.lowVoltsCell(),
    topics.lowVoltsChip()
  );

export const highCellTempReadout = (): QuickViewReadout =>
  locatedCellReadout(
    'Max Cell Temp',
    'thermostat',
    '°C',
    1,
    topics.highTempValue(),
    topics.highTempCell(),
    topics.highTempChip()
  );

export const currentLimitsReadout = (): QuickViewReadout => {
  const ccl = topicNumber(topics.accCCL());
  const dcl = topicNumber(topics.accDCL());
  const show = (amps: number | undefined) => (amps === undefined || !isFinite(amps) ? '–' : amps.toFixed(0));
  return {
    label: 'CCL / DCL',
    icon: 'speed',
    value: computed(() => (ccl() === undefined && dcl() === undefined ? undefined : `${show(ccl())} / ${show(dcl())}`)),
    unit: 'A'
  };
};

const CHARGER_FAULTS: readonly FaultTopic[] = [
  { name: 'Comm Timeout', topic: topics.commTimeoutFault() },
  { name: 'Hardware Failure', topic: topics.hardwareFailureFault() },
  { name: 'Over Temp', topic: topics.overTempFault() },
  { name: 'Voltage Wrong', topic: topics.overVoltageFault() },
  { name: 'Wrong Battery Connect', topic: topics.wrongBatConnectFault() }
];

const BMS_CRITICAL_FAULTS: readonly FaultTopic[] = [
  { name: 'Open Wire', topic: topics.openWire() },
  { name: 'CCL Enforce', topic: topics.chargerLimitEnforcementFault() },
  { name: 'Charger CAN', topic: topics.chargerCanFault() },
  { name: 'Battery Thermistor', topic: topics.batteryThermistor() },
  { name: 'Charger Safety Relay', topic: topics.chargerSafetyRelay() },
  { name: 'DCL Enforce', topic: topics.dischargeLimitEnforcementFault() },
  { name: 'External CAN', topic: topics.externalCanFault() },
  { name: 'Weak Pack', topic: topics.weakPackFault() },
  { name: 'Low Cell Voltage', topic: topics.lowCellVoltage() },
  { name: 'Charge Reading', topic: topics.chargeReadingMismatch() },
  { name: 'Current Sensor', topic: topics.currentSensorFault() },
  { name: 'IC Comm', topic: topics.internalCellCommFault() },
  { name: 'Thermal Error', topic: topics.internalThermalError() },
  { name: 'Software', topic: topics.internalSoftwareFault() },
  { name: 'Pack Overheat', topic: topics.packOverheat() },
  { name: 'Cell Undervoltage', topic: topics.cellUndervoltage() },
  { name: 'Cell Overvoltage', topic: topics.cellOvervoltage() },
  { name: 'Cells Not Balancing', topic: topics.cellsNotBalancing() }
];

export const chargerFaultReadout = (): QuickViewReadout => faultReadout('Charger Fault', 'Charger', CHARGER_FAULTS);

export const bmsCriticalFaultReadout = (): QuickViewReadout =>
  faultReadout('BMS Critical Fault', 'BMS', BMS_CRITICAL_FAULTS);

/**
 * The physical LV battery (VCU/LV/voltage), distinct from the LV eFuse card. Its dot is driven
 * purely by the firmware low-voltage fault flag, never a hardcoded voltage cutoff (#705).
 */
export const lvBatteryReadout = (): QuickViewReadout => {
  const fault = topicNumber(EFUSE_TOPICS.VCU.LV.LowVoltageFault);
  return {
    label: 'LV Battery',
    icon: 'battery_charging_2',
    value: topicNumber(EFUSE_TOPICS.VCU.LV.Voltage),
    unit: 'V',
    decimals: 2,
    status: computed(() =>
      fault() === 1 ? { color: FAULT, label: 'LV battery fault' } : { color: OK, label: 'LV battery nominal' }
    )
  };
};
