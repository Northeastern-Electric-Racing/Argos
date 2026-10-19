import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import BmsQuickViewComponent from './bms-quick-view.component';

// Drive the readouts by publishing to Storage and read the chips back by label.
// Zoneless change detection is registered globally in src/test-setup.ts.
describe('BmsQuickViewComponent', () => {
  let fixture: ComponentFixture<BmsQuickViewComponent>;
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
  const detail = (label: string) => chip(label).querySelector('.detail')?.textContent?.trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BmsQuickViewComponent] }).compileComponents();
    storage = TestBed.inject(Storage);
    fixture = TestBed.createComponent(BmsQuickViewComponent);
    fixture.detectChanges();
  });

  it('shows state of charge as a percentage and the pack voltage', () => {
    publish(topics.stateOfCharge(), 0.5);
    publish(topics.packVoltage(), 440.04);

    expect(value('State of Charge')).toBe('50');
    expect(value('Pack Voltage')).toBe('440.0');
  });

  it('shows the highest and lowest cell voltage with where each came from', () => {
    publish(topics.highVoltsValue(), 4.1234);
    publish(topics.highVoltsCell(), 7);
    publish(topics.highVoltsChip(), 3);
    publish(topics.lowVoltsValue(), 3.9876);
    publish(topics.lowVoltsCell(), 2);
    publish(topics.lowVoltsChip(), 4);

    expect(value('Highest Cell')).toBe('4.123');
    expect(detail('Highest Cell')).toBe('Cell: 7 | Chip: B');
    expect(value('Lowest Cell')).toBe('3.988');
    expect(detail('Lowest Cell')).toBe('Cell: 2 | Chip: A');
  });

  it('shows the hottest cell with its location', () => {
    publish(topics.highTempValue(), 33.36);
    publish(topics.highTempCell(), 5);
    publish(topics.highTempChip(), 0);

    expect(value('Highest Cell Temp')).toBe('33.4');
    expect(detail('Highest Cell Temp')).toBe('Cell: 5 | Chip: A');
  });

  it('shows the charge and discharge current limits', () => {
    publish(topics.accCCL(), 20);
    publish(topics.accDCL(), 150);

    expect(value('Charge Limit (CCL)')).toBe('20');
    expect(value('Discharge Limit (DCL)')).toBe('150');
  });

  it('reports no critical BMS fault until one is raised, then names it and counts the rest', () => {
    expect(value('Critical BMS Fault')).toBe('None');

    publish(topics.packOverheat(), 1);
    publish(topics.openWire(), 1);

    expect(value('Critical BMS Fault')).toBe('Open Wire');
    expect(detail('Critical BMS Fault')).toBe('+1 more');
    expect(chip('Critical BMS Fault').querySelector('.dot')?.classList).toContain('fault');
  });
});
