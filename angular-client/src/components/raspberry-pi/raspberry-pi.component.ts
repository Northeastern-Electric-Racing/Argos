import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { floatPipe } from 'src/utils/pipes.utils';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import RaspberryPiDesktopComponent from './raspberry-pi-desktop-content/raspberry-pi-desktop.component';
import RaspberryPiMobileComponent from './raspberry-pi-mobile-content/raspberry-pi-mobile.component';

@Component({
  selector: 'raspberry-pi',
  templateUrl: './raspberry-pi.component.html',
  styleUrls: ['./raspberry-pi.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, RaspberryPiDesktopComponent, RaspberryPiMobileComponent],
  host: {
    '(window:resize)': 'onResize()'
  }
})
export default class RasberryPiComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  cpuUsage: number = 0;
  cpuTemp: number = 0;
  ramUsage: number = 0;
  wifiRSSI: number = 0;
  mcs: number = 0;

  mobileThreshold = 768;
  isMobile = window.innerWidth < this.mobileThreshold;

  ngOnInit() {
    this.storage
      .get(topics.cpuUsage())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.cpuUsage = floatPipe(value.values[0]);
      });
    this.storage
      .get(topics.cpuTemp())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.cpuTemp = floatPipe(value.values[0]);
      });
    this.storage
      .get(topics.ramUsage())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.ramUsage = Math.round((1 - floatPipe(value.values[0]) / 8000) * 100);
      });
    this.storage
      .get(topics.wifiRSSI())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.wifiRSSI = floatPipe(value.values[0]);
      });
    this.storage
      .get(topics.mcs())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.mcs = floatPipe(value.values[0]);
      });
  }

  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
