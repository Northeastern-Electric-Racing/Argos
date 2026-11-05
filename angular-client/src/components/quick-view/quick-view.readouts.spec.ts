import { TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { QuickViewReadout } from 'src/services/quick-view.service';
import { topics } from 'src/utils/topic.utils';
import {
  bmsCriticalFaultReadout,
  bmsStateReadout,
  cellSpreadReadout,
  chargerFaultReadout,
  currentLimitsReadout,
  highCellVoltReadout,
  lvBatteryReadout,
  packVoltageReadout,
  stateOfChargeReadout
} from './quick-view.readouts';

// Readout factories turn live topics into descriptors. Drive them through the real Storage, as
// the socket service does, and assert on what the descriptor would show.
describe('quick view readouts', () => {
  let storage: Storage;

  const publish = (topic: string, value: number) =>
    storage.addValue(topic, { values: [String(value)], time: '0', unit: '' });
  const make = (factory: () => QuickViewReadout) => TestBed.runInInjectionContext(factory);

  beforeEach(() => {
    storage = TestBed.inject(Storage);
  });

  it('shows no value until the topic publishes', () => {
    const readout = make(packVoltageReadout);

    expect(readout.value()).toBeUndefined();

    publish(topics.packVoltage(), 402.5);
    expect(readout.value()).toBe(402.5);
    expect(readout.unit).toBe('V');
  });

  it('shows state of charge as a percent of the published fraction', () => {
    const readout = make(stateOfChargeReadout);

    publish(topics.stateOfCharge(), 0.8);

    expect(readout.value()).toBeCloseTo(80);
    expect(readout.unit).toBe('%');
  });

  it('names the BMS state', () => {
    const readout = make(bmsStateReadout);

    publish(topics.bmsMode(), 2);

    expect(readout.value()).toBe('CHARGING');
    expect(readout.status?.()?.label).toBe('BMS charging');
  });

  it('shows the high/low cell spread in millivolts', () => {
    const readout = make(cellSpreadReadout);

    publish(topics.highVoltsValue(), 3.95);
    publish(topics.lowVoltsValue(), 3.9);

    expect(readout.value()).toBeCloseTo(50);
    expect(readout.unit).toBe('mV');
  });

  it('locates the highest cell', () => {
    const readout = make(highCellVoltReadout);

    publish(topics.highVoltsValue(), 4.1);
    publish(topics.highVoltsCell(), 4);
    publish(topics.highVoltsChip(), 1);

    expect(readout.value()).toBe(4.1);
    expect(readout.detail?.()).toBe('Cell: 4 | Chip: B');
  });

  it('shows the charge and discharge current limits together', () => {
    const readout = make(currentLimitsReadout);

    publish(topics.accCCL(), 120);
    publish(topics.accDCL(), 250);

    expect(readout.value()).toBe('120 / 250');
  });

  describe('fault readouts', () => {
    it('reads "None" with a nominal dot until a fault is raised', () => {
      const readout = make(chargerFaultReadout);

      expect(readout.value()).toBe('None');
      expect(readout.status?.()?.label).toBe('No charger fault');
    });

    it('names the active fault, counts the rest, and clears when it stops', () => {
      const readout = make(chargerFaultReadout);

      publish(topics.overTempFault(), 1);
      expect(readout.value()).toBe('Over Temp');
      expect(readout.status?.()?.label).toBe('Charger fault active');

      publish(topics.commTimeoutFault(), 1);
      expect(readout.value()).toBe('Over Temp +1');

      publish(topics.overTempFault(), 0);
      publish(topics.commTimeoutFault(), 0);
      expect(readout.value()).toBe('None');
    });

    it('watches the BMS critical faults', () => {
      const readout = make(bmsCriticalFaultReadout);

      publish(topics.packOverheat(), 1);

      expect(readout.value()).toBe('Pack Overheat');
    });
  });

  describe('LV battery', () => {
    it('shows the voltage to two decimals over the eFuses LV label', () => {
      const readout = make(lvBatteryReadout);

      publish('VCU/LV/voltage', 24.5);

      expect(readout.value()).toBe(24.5);
      expect(readout.decimals).toBe(2);
      expect(readout.label).toBe('LV Battery');
    });

    it('drives the dot purely from the firmware fault flag', () => {
      const readout = make(lvBatteryReadout);

      publish('VCU/LV/voltage', 10);
      expect(readout.status?.()?.label).toBe('LV battery nominal');

      publish('VCU/Faults/Non-Critical/LV_LOW_VOLTAGE_FAULT', 1);
      expect(readout.status?.()?.label).toBe('LV battery fault');
    });
  });
});
