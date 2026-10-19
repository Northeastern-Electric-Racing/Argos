import { map, merge, Observable, scan, startWith } from 'rxjs';
import Storage from 'src/services/storage.service';
import { topics } from './topic.utils';

/** A fault flag topic and the name shown for it. */
export interface NamedFault {
  name: string;
  topic: string;
}

export const CHARGER_FAULTS: readonly NamedFault[] = [
  { name: 'Comm Timeout', topic: topics.commTimeoutFault() },
  { name: 'Hardware Failure', topic: topics.hardwareFailureFault() },
  { name: 'Over Temp', topic: topics.overTempFault() },
  { name: 'Over Voltage Fault', topic: topics.overVoltageFault() },
  { name: 'Wrong Battery Connect', topic: topics.wrongBatConnectFault() }
];

export const BMS_CRITICAL_FAULTS: readonly NamedFault[] = [
  { name: 'Open Wire', topic: topics.openWire() },
  { name: 'Charger Limit Enforcement', topic: topics.chargerLimitEnforcementFault() },
  { name: 'Charger Can Fault', topic: topics.chargerCanFault() },
  { name: 'Battery Thermistor', topic: topics.batteryThermistor() },
  { name: 'Charger Safety Relay', topic: topics.chargerSafetyRelay() },
  { name: 'Discharge Limit Enforcement', topic: topics.dischargeLimitEnforcementFault() },
  { name: 'External Can Fault', topic: topics.externalCanFault() },
  { name: 'Weak Pack Fault', topic: topics.weakPackFault() },
  { name: 'Low Cell Voltage', topic: topics.lowCellVoltage() },
  { name: 'Charge Reading Mismatch', topic: topics.chargeReadingMismatch() },
  { name: 'Current Sensor Fault', topic: topics.currentSensorFault() },
  { name: 'Internal Cell Comm Fault', topic: topics.internalCellCommFault() },
  { name: 'Internal Thermal Error', topic: topics.internalThermalError() },
  { name: 'Internal Software Fault', topic: topics.internalSoftwareFault() },
  { name: 'Pack Overheat', topic: topics.packOverheat() },
  { name: 'Cell Undervoltage', topic: topics.cellUndervoltage() },
  { name: 'Cell Overvoltage', topic: topics.cellOvervoltage() },
  { name: 'Cells Not Balancing', topic: topics.cellsNotBalancing() }
];

/**
 * Names of the faults whose flag is currently raised (latest value non-zero), in list order.
 * Emits `[]` straight away, since a fault topic may never publish while nothing is wrong.
 */
export const activeFaultNames = (storage: Storage, faults: readonly NamedFault[]): Observable<string[]> =>
  merge(
    ...faults.map((fault) => storage.get(fault.topic).pipe(map((v) => [fault, Number(v.values[0]) !== 0] as const)))
  ).pipe(
    scan((active, [fault, raised]) => {
      const next = new Set(active);
      if (raised) next.add(fault);
      else next.delete(fault);
      return next;
    }, new Set<NamedFault>()),
    map((active) => faults.filter((fault) => active.has(fault)).map((fault) => fault.name)),
    startWith([])
  );
