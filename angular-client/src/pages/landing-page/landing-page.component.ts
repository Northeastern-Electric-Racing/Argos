import { Component, HostListener, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { startNewRun } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import Storage from 'src/services/storage.service';


import { MatGridList, MatGridTile } from '@angular/material/grid-list';
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
    styleUrls: ['./landing-page.component.css'],
    templateUrl: './landing-page.component.html',
    standalone: true,
    imports: [ LandingPageMobileComponent, MatGridList, MatGridTile, DateLocationComponent, CurrentRunDisplayComponent, ViewerDisplayComponent, DriverComponent, AccelerationGraphsComponent, BrakePressureDisplayComponent, RasberryPiComponent, AccelerationOverTimeDisplayComponent, SpeedOverTimeDisplayComponent, MotorInfoComponent,TorqueDisplayComponent, LatencyDisplayComponent, ConnectionDisplayComponent]
})
export default class LandingPageComponent implements OnInit {
  private storage = inject(Storage);
  private serverService = inject(APIService);
  private messageService = inject(MessageService);
  time = new Date();
  newRunIsLoading = false;
  mobileThreshold = 768;
  isMobile = window.innerWidth < this.mobileThreshold;

  ngOnInit() {
    this.onStartNewRun = () => {
      const runsQueryResponse = this.serverService.query(() => startNewRun(), { invalidates: ['runs'] });
      runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
        this.newRunIsLoading = isLoading;
      });
      runsQueryResponse.error.subscribe((error) => {
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

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
