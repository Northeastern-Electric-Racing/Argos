import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import ChargingQuickViewComponent from './charging-quick-view.component';

// Drive the readouts the way the car does — by publishing to Storage — and read the chips back
// from the DOM by their label. Zoneless change detection is registered globally in src/test-setup.ts.
describe('ChargingQuickViewComponent', () => {
  let fixture: ComponentFixture<ChargingQuickViewComponent>;
  let storage: Storage;

  const publish = (topic: string, value: number) => {
    storage.addValue(topic, { values: [String(value)], time: '0', unit: '' });
    fixture.detectChanges();
  };
  const chip = (label: string): HTMLElement => {
    const chips = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('quick-view-chip'));
    const found = chips.find((c) => c.querySelector('.label')?.textContent?.trim() === label);
    if (!found) throw new Error(`No chip labelled ${label}`);
    return found as HTMLElement;
  };
  const value = (label: string) => chip(label).querySelector('.value')?.textContent?.trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ChargingQuickViewComponent] }).compileComponents();
    storage = TestBed.inject(Storage);
    fixture = TestBed.createComponent(ChargingQuickViewComponent);
    fixture.detectChanges();
  });

  it('shows placeholders before any data arrives', () => {
    expect(value('State of Charge')).toBe('–');
    expect(value('Pack Voltage')).toBe('–');
  });

  it('shows state of charge as a percentage of the 0–1 fraction BMS publishes', () => {
    publish(topics.stateOfCharge(), 0.734);

    expect(value('State of Charge')).toBe('73');
  });

  it('shows pack voltage, charging current and the hottest cell', () => {
    publish(topics.packVoltage(), 451.26);
    publish(topics.current(), 12.34);
    publish(topics.highTempValue(), 31.27);

    expect(value('Pack Voltage')).toBe('451.3');
    expect(value('Charging Current')).toBe('12.3');
    expect(value('Highest Cell Temp')).toBe('31.3');
  });

  it('names the BMS state, flagging charging as ok and faulted as a fault', () => {
    publish(topics.bmsMode(), 2);
    expect(value('BMS State')).toBe('CHARGING');
    expect(chip('BMS State').querySelector('.dot')?.classList).toContain('ok');

    publish(topics.bmsMode(), 3);
    expect(value('BMS State')).toBe('FAULTED');
    expect(chip('BMS State').querySelector('.dot')?.classList).toContain('fault');
  });

  it('shows whether the pack is balancing', () => {
    publish(topics.statusBalancing(), 1);
    expect(value('Balancing')).toBe('Yes');

    publish(topics.statusBalancing(), 0);
    expect(value('Balancing')).toBe('No');
  });

  it('shows the high/low cell voltage spread in millivolts', () => {
    publish(topics.highVoltsValue(), 4.105);
    publish(topics.lowVoltsValue(), 4.087);

    expect(value('Cell Spread')).toBe('18');
    expect(chip('Cell Spread').querySelector('.detail')?.textContent?.trim()).toBe('4.087 – 4.105 V');
  });

  it('reports no charger fault until one is raised, then names it', () => {
    expect(value('Charger Fault')).toBe('None');
    expect(chip('Charger Fault').querySelector('.dot')?.classList).toContain('ok');

    publish(topics.overTempFault(), 1);

    expect(value('Charger Fault')).toBe('Over Temp');
    expect(chip('Charger Fault').querySelector('.dot')?.classList).toContain('fault');
  });
});
