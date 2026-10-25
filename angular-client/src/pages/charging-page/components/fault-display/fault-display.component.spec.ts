import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import FaultDisplayComponent from './fault-display.component';

const push = (storage: Storage, key: string, value: string): void => {
  storage.addValue(key, { values: [value], time: '0', unit: '' } as DataValue);
};

// The BMS critical faults the car publishes (Odyssey-Definitions can-messages/bms.json).
const liveBmsCriticalFaults = [
  { topic: 'BMS/Faults/Critical/DCL_Enforce', name: 'Discharge Limit Enforcement' },
  { topic: 'BMS/Faults/Critical/CCL_Enforce', name: 'Charger Limit Enforcement' },
  { topic: 'BMS/Faults/Critical/Cell_Voltage_Low', name: 'Cell Voltage Low' },
  { topic: 'BMS/Faults/Critical/Cell_Voltage_High', name: 'Cell Voltage High' },
  { topic: 'BMS/Faults/Critical/Charging_Voltage_High', name: 'Charging Voltage High' },
  { topic: 'BMS/Faults/Critical/Pack_too_hot', name: 'Pack Too Hot' },
  { topic: 'BMS/Faults/Critical/High_die_temp', name: 'High Die Temp' },
  { topic: 'BMS/Faults/Critical/Cell_open_wire', name: 'Cell Open Wire' }
];

// Topics the display used to watch that the car no longer publishes.
const deadBmsFaultTopics = [
  'BMS/Faults/Critical/Open_Wire',
  'BMS/Faults/Critical/Charger_Can',
  'BMS/Faults/Critical/Battery_Therm',
  'BMS/Faults/Critical/Charger_Safety',
  'BMS/Faults/Critical/External_Can',
  'BMS/Faults/Critical/Weak_Pack',
  'BMS/Faults/Critical/Low_Cell_Volts',
  'BMS/Faults/Critical/Charge_Reading',
  'BMS/Faults/Critical/Current_Sense',
  'BMS/Faults/Critical/IC_Comm',
  'BMS/Faults/Critical/Thermal_Err',
  'BMS/Faults/Critical/Software',
  'BMS/Faults/Critical/Pack_Overheat',
  'BMS/Faults/Critical/Cell_Undervoltage',
  'BMS/Faults/Critical/Cell_Overvoltage',
  'BMS/Faults/Critical/Cells_Not_Balancing'
];

describe('FaultDisplayComponent', () => {
  let fixture: ComponentFixture<FaultDisplayComponent>;
  let component: FaultDisplayComponent;
  let storage: Storage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaultDisplayComponent],
      providers: [provideZonelessChangeDetection(), Storage]
    }).compileComponents();

    storage = TestBed.inject(Storage);
    fixture = TestBed.createComponent(FaultDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit subscribes to the fault topics
  });

  liveBmsCriticalFaults.forEach(({ topic, name }) => {
    it(`shows ${topic} when it is raised`, () => {
      push(storage, topic, '1');

      expect(component.faults.map(({ type, name }) => ({ type, name }))).toEqual([{ type: 'BMS', name }]);
    });
  });

  it('shows nothing for topics the car no longer publishes', () => {
    deadBmsFaultTopics.forEach((topic) => push(storage, topic, '1'));

    expect(component.faults).toEqual([]);
  });

  it('still shows a charger fault when it is raised', () => {
    push(storage, 'Charger/Box/F_OverTemp', '1');

    expect(component.faults.map(({ type, name }) => ({ type, name }))).toEqual([{ type: 'Charger', name: 'Over Temp' }]);
  });

  it('logs a fault once when it is raised, and again only after it clears', () => {
    ['1', '1', '0', '1'].forEach((value) => push(storage, 'BMS/Faults/Critical/Pack_too_hot', value));

    expect(component.faults.length).toBe(2);
  });
});
