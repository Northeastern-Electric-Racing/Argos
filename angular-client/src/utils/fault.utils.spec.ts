import { TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { activeFaultNames, BMS_CRITICAL_FAULTS, CHARGER_FAULTS } from './fault.utils';

describe('activeFaultNames', () => {
  const faults = [
    { name: 'First', topic: 'Test/Faults/First' },
    { name: 'Second', topic: 'Test/Faults/Second' }
  ];
  let storage: Storage;
  let latest: string[] | undefined;

  const publish = (topic: string, value: string) => storage.addValue(topic, { values: [value], time: '0', unit: '' });

  beforeEach(() => {
    storage = TestBed.inject(Storage);
    latest = undefined;
    activeFaultNames(storage, faults).subscribe((names) => (latest = names));
  });

  it('starts with no active faults before any flag arrives', () => {
    expect(latest).toEqual([]);
  });

  it('lists every raised flag in declaration order', () => {
    publish('Test/Faults/Second', '1');
    publish('Test/Faults/First', '1');

    expect(latest).toEqual(['First', 'Second']);
  });

  it('drops a fault once its flag clears', () => {
    publish('Test/Faults/First', '1');
    publish('Test/Faults/First', '0');

    expect(latest).toEqual([]);
  });
});

describe('fault lists', () => {
  it('name each charger and critical BMS fault topic once', () => {
    for (const list of [CHARGER_FAULTS, BMS_CRITICAL_FAULTS]) {
      expect(new Set(list.map((f) => f.topic)).size).toBe(list.length);
    }
    expect(CHARGER_FAULTS.every((f) => f.topic.startsWith('Charger/'))).toBeTrue();
    expect(BMS_CRITICAL_FAULTS.every((f) => f.topic.startsWith('BMS/Faults/Critical/'))).toBeTrue();
  });
});
