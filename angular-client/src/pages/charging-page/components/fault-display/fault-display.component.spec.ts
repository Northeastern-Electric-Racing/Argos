import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import { topics } from 'src/utils/topic.utils';
import FaultDisplayComponent from './fault-display.component';

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

/** A colour token's #rrggbb value, read from the theme (jsdom loads no CSS). */
const theme = readFileSync(resolve(process.cwd(), 'src/styles/theme.css'), 'utf8');
const token = (name: string): string => {
  const hex = theme.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{3,6})\\b`, 'i'))?.[1] ?? '';
  return hex.length === 4 ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex;
};
/** WCAG contrast of two #rrggbb colours. */
const contrast = (a: string, b: string): number => {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('FaultDisplayComponent', () => {
  let fixture: ComponentFixture<FaultDisplayComponent>;
  let component: FaultDisplayComponent;
  let storage: Storage;

  const push = (key: string, value: string) => {
    storage.addValue(key, { values: [value], time: '0', unit: '' } as DataValue);
    fixture.detectChanges();
  };
  const shown = () => component.faults().map(({ type, name }) => ({ type, name }));
  const rows = (): HTMLElement[] => [...fixture.nativeElement.querySelectorAll('[data-fault]')];
  const clear = (): HTMLButtonElement => fixture.nativeElement.querySelector('button[aria-label="Clear the faults"]');

  beforeEach(() => {
    fixture = TestBed.createComponent(FaultDisplayComponent);
    component = fixture.componentInstance;
    storage = TestBed.inject(Storage);
    fixture.detectChanges(); // ngOnInit subscribes to the fault topics
  });

  liveBmsCriticalFaults.forEach(({ topic, name }) => {
    it(`shows ${topic} when it is raised`, () => {
      push(topic, '1');

      expect(shown()).toEqual([{ type: 'BMS', name }]);
    });
  });

  it('shows nothing for a topic it does not watch', () => {
    push('BMS/Faults/Critical/Not_A_Real_Fault', '1');

    expect(component.faults()).toEqual([]);
  });

  it('still shows a charger fault when it is raised', () => {
    push('Charger/Box/F_OverTemp', '1');

    expect(shown()).toEqual([{ type: 'Charger', name: 'Over Temp' }]);
  });

  it('logs a fault once when it is raised, and again only after it clears', () => {
    ['1', '1', '0', '1'].forEach((value) => push('BMS/Faults/Critical/Pack_too_hot', value));

    expect(component.faults().length).toBe(2);
  });

  it('lists a fault when its value turns non-zero, newest first, each keeping its fill', () => {
    push(topics.commTimeoutFault(), '1');
    expect(rows().map((r) => r.dataset['fault'])).toEqual(['Comm Timeout']);
    expect(rows()[0].dataset['lit']).toBe('true');

    push(topics.commTimeoutFault(), '1');
    expect(rows().length).toBe(1);

    push(topics.overTempFault(), '2');
    expect(rows().map((r) => r.dataset['fault'])).toEqual(['Over Temp', 'Comm Timeout']);
    expect(rows().map((r) => r.dataset['lit'])).toEqual(['false', 'true']);
    expect(rows()[0].textContent).toContain('Charger');
  });

  it('puts white text only on a fill at least as dark as accent-strong (CONTEXT.md), so a lit row reads at AA', () => {
    expect(token('on-fault')).toBe('#ffffff');
    expect(contrast(token('on-fault'), token('fault'))).toBeGreaterThanOrEqual(
      contrast(token('on-accent'), token('accent-strong'))
    );
  });

  it('clears the list with a named button', () => {
    push(topics.cellOpenWire(), '1');
    expect(rows().length).toBe(1);

    clear().click();
    fixture.detectChanges();
    expect(rows().length).toBe(0);
  });
});
