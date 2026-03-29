import { Component, HostListener, OnInit, inject } from '@angular/core';
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
  imports: [InfoBackgroundComponent, RaspberryPiDesktopComponent, RaspberryPiMobileComponent]
})
export default class RasberryPiComponent implements OnInit {
  private storage = inject(Storage);
  cpuUsage: number = 0;
  cpuTemp: number = 0;
  ramUsage: number = 0;
  wifiRSSI: number = 0;
  mcs: number = 0;

  mobileThreshold = 768;
  isMobile = window.innerWidth < this.mobileThreshold;

  ngOnInit() {
    this.storage.get(topics.cpuUsage()).subscribe((value) => {
      this.cpuUsage = floatPipe(value.values[0]);
    });
    this.storage.get(topics.cpuTemp()).subscribe((value) => {
      this.cpuTemp = floatPipe(value.values[0]);
    });
    this.storage.get(topics.ramUsage()).subscribe((value) => {
      this.ramUsage = Math.round((1 - floatPipe(value.values[0]) / 8000) * 100);
    });
    this.storage.get(topics.wifiRSSI()).subscribe((value) => {
      this.wifiRSSI = floatPipe(value.values[0]);
    });
    this.storage.get(topics.mcs()).subscribe((value) => {
      this.mcs = floatPipe(value.values[0]);
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
