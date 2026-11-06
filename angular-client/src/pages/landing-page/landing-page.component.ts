import { ToastService } from 'src/ui/toast/toast.service';
import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startNewRun } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import Storage from 'src/services/storage.service';

import { gridTileClass, tileGridClass } from 'src/ui/recipes/grid';
import { DateLocationComponent } from './components/date-location-display/date-location.component';
import { CurrentRunDisplayComponent } from './components/current-run-display/current-run-display.component';
import { ViewerDisplayComponent } from './components/viewer-display/viewer-display.component';
import { DriverComponent } from '../../components/driver-component/driver-component';
import { AccelerationGraphsComponent } from '../../components/acceleration-graphs/acceleration-graphs.component';
import BrakePressureDisplayComponent from 'src/components/brake-pressure-display/brake-pressure-display.component';
import RasberryPiComponent from 'src/components/raspberry-pi/raspberry-pi.component';
import AccelerationOverTimeDisplayComponent from 'src/components/acceleration-over-time-display/acceleration-over-time-display.component';
import SpeedOverTimeDisplayComponent from 'src/components/speed-over-time-display/speed-over-time-display.component';
import MotorInfoComponent from 'src/components/motor-info/motor-info.component';
import TorqueDisplayComponent from 'src/components/torque-display/torque-display.component';
import LatencyDisplayComponent from 'src/components/latency-display/latency-display';
import ConnectionDisplayComponent from './components/connection-display/connection-display.component';
import LandingPageMobileComponent from './landing-page-mobile/landing-page-mobile.component';

/**
 * Container for the landing page, obtains data from the storage service.
 */
@Component({
  selector: 'landing-page',
  templateUrl: './landing-page.component.html',
  imports: [
    LandingPageMobileComponent,
    DateLocationComponent,
    CurrentRunDisplayComponent,
    ViewerDisplayComponent,
    DriverComponent,
    AccelerationGraphsComponent,
    BrakePressureDisplayComponent,
    RasberryPiComponent,
    AccelerationOverTimeDisplayComponent,
    SpeedOverTimeDisplayComponent,
    MotorInfoComponent,
    TorqueDisplayComponent,
    LatencyDisplayComponent,
    ConnectionDisplayComponent
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    '(window:resize)': 'onResize()'
  }
})
export default class LandingPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  private serverService = inject(APIService);
  private messageService = inject(ToastService);
  time = new Date();

  /** 814's 6-column mat-grid-list (1.5rem rows, 15px gutters), tile by tile (columns × rows). */
  protected readonly grid = tileGridClass;
  protected readonly tiles = {
    dateLocation: gridTileClass(2, 4),
    small: gridTileClass(1, 4),
    torque: gridTileClass(1, 5),
    motor: gridTileClass(3, 5),
    driver: gridTileClass(2, 5),
    overTime: gridTileClass(3, 7),
    acceleration: gridTileClass(3, 14),
    raspberryPi: gridTileClass(4, 6),
    brakes: gridTileClass(2, 6)
  } as const;
  newRunIsLoading = false;
  mobileThreshold = 768;
  isMobile = window.innerWidth < this.mobileThreshold;

  ngOnInit() {
    this.onStartNewRun = () => {
      const runsQueryResponse = this.serverService.query(() => startNewRun(), { invalidates: ['runs'] });
      runsQueryResponse.isLoading.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isLoading: boolean) => {
        this.newRunIsLoading = isLoading;
      });
      runsQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
        if (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
        }
      });
    };

    setInterval(() => {
      this.time = new Date();
    }, 1000);
  }

  onStartNewRun!: () => void;

  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
