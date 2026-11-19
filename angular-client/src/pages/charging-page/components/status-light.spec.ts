import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import ActiveStatusComponent from './active-status/active-status.component';
import BalancingStatusComponent from './balancing-status/balancing-status.component';
import ChargingStatusComponent from './charging-state/charging-status.component';
import FaultedStatusComponent from './faulted-status/faulted-status.component';

/**
 * The four status cards on the charging page each show a light that is lit while the car is in that state.
 * The light is an image named after the state, so the state isn't told by colour alone (WCAG 1.4.1).
 */
const cases: { name: string; component: Type<unknown>; topic: () => string; on: number; off: number }[] = [
  { name: 'Active', component: ActiveStatusComponent, topic: topics.bmsMode, on: 2, off: 1 },
  { name: 'Faulted', component: FaultedStatusComponent, topic: topics.bmsMode, on: 3, off: 1 },
  { name: 'Charging', component: ChargingStatusComponent, topic: topics.charging, on: 0, off: 1 },
  { name: 'Balancing', component: BalancingStatusComponent, topic: topics.statusBalancing, on: 1, off: 0 }
];

describe('charging status lights', () => {
  for (const c of cases) {
    describe(c.name, () => {
      let fixture: ComponentFixture<unknown>;
      let storage: Storage;

      const emit = (value: number) => {
        storage.addTimerValue(c.topic(), {
          topic: c.topic(),
          last_change: Date.now(),
          last_value: value,
          total_time_per_value_map: {}
        });
        fixture.detectChanges();
      };
      const light = (): HTMLElement | null => fixture.nativeElement.querySelector('[role="img"][data-on]');

      beforeEach(() => {
        fixture = TestBed.createComponent(c.component);
        storage = TestBed.inject(Storage);
        fixture.detectChanges();
      });

      it('names the light after the state, off until the state is reported', () => {
        expect(light()?.getAttribute('aria-label')).toBe(`Not ${c.name.toLowerCase()}`);
        expect(light()?.dataset['on']).toBe('false');
      });

      it('lights up while the state holds and goes out when it ends', () => {
        emit(c.on);
        expect(light()?.getAttribute('aria-label')).toBe(c.name);
        expect(light()?.dataset['on']).toBe('true');

        emit(c.off);
        expect(light()?.getAttribute('aria-label')).toBe(`Not ${c.name.toLowerCase()}`);
        expect(light()?.dataset['on']).toBe('false');
      });

      it('hides the light when the card is too narrow for it', () => {
        (fixture.componentRef as { setInput: (k: string, v: unknown) => void }).setInput('displayLight', false);
        fixture.detectChanges();
        expect(light()).toBeNull();
      });
    });
  }
});
