import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import { topics } from 'src/utils/topic.utils';
import FaultDisplayComponent from './fault-display.component';

describe('FaultDisplayComponent', () => {
  let fixture: ComponentFixture<FaultDisplayComponent>;
  let storage: Storage;

  const push = (key: string, value: string) => {
    storage.addValue(key, { values: [value], time: '0', unit: '' } as DataValue);
    fixture.detectChanges();
  };
  const rows = (): HTMLElement[] => [...fixture.nativeElement.querySelectorAll('[data-fault]')];
  const clear = (): HTMLButtonElement => fixture.nativeElement.querySelector('button[aria-label="Clear the faults"]');

  beforeEach(() => {
    fixture = TestBed.createComponent(FaultDisplayComponent);
    storage = TestBed.inject(Storage);
    fixture.detectChanges();
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

  it('clears the list with a named button', () => {
    push(topics.openWire(), '1');
    expect(rows().length).toBe(1);

    clear().click();
    fixture.detectChanges();
    expect(rows().length).toBe(0);
  });
});
