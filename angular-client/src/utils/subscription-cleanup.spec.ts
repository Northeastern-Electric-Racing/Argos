import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import Storage from 'src/services/storage.service';
import BrakePressureDisplayComponent from 'src/components/brake-pressure-display/brake-pressure-display.component';
import { DriverComponent } from 'src/components/driver-component/driver-component';
import RasberryPiComponent from 'src/components/raspberry-pi/raspberry-pi.component';
import SpeedDisplayComponent from 'src/components/speed-display/speed-display.component';
import { SteeringAngleDisplayComponent } from 'src/components/steering-angle-display/steering-angle-display.component';
import TorqueDisplayComponent from 'src/components/torque-display/torque-display.component';
import ActiveStatusComponent from 'src/pages/charging-page/components/active-status/active-status.component';
import BalancingStatusComponent from 'src/pages/charging-page/components/balancing-status/balancing-status.component';
import ChargingStatusComponent from 'src/pages/charging-page/components/charging-state/charging-status.component';
import PackTempComponent from 'src/pages/charging-page/components/pack-temp/pack-temp.component';

/**
 * Every component that listens to telemetry must stop listening when it is destroyed, otherwise the
 * Storage subjects keep observers (and their topics) alive after the page is gone.
 */
describe('subscription cleanup on destroy', () => {
  const observedKeys = (storage: Storage): string[] => {
    const maps = [storage['storage'], storage['timerStorage']] as Map<string, Subject<unknown>>[];
    return maps.flatMap((map) => [...map.entries()].filter(([, subject]) => subject.observed).map(([key]) => key));
  };

  const components: [string, Type<unknown>][] = [
    ['BrakePressureDisplayComponent', BrakePressureDisplayComponent],
    ['DriverComponent', DriverComponent],
    ['RasberryPiComponent', RasberryPiComponent],
    ['SpeedDisplayComponent', SpeedDisplayComponent],
    ['SteeringAngleDisplayComponent', SteeringAngleDisplayComponent],
    ['TorqueDisplayComponent', TorqueDisplayComponent],
    ['ActiveStatusComponent', ActiveStatusComponent],
    ['BalancingStatusComponent', BalancingStatusComponent],
    ['ChargingStatusComponent', ChargingStatusComponent],
    ['PackTempComponent', PackTempComponent]
  ];

  components.forEach(([name, component]) => {
    it(`${name} releases its Storage subscriptions`, () => {
      const storage = TestBed.inject(Storage);
      const fixture = TestBed.createComponent(component);
      fixture.detectChanges();
      expect(observedKeys(storage).length).withContext('subscribes while alive').toBeGreaterThan(0);

      fixture.destroy();

      expect(observedKeys(storage)).toEqual([]);
    });
  });
});
