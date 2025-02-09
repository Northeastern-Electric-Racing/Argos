import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'combined-status-display',
  templateUrl: './combined-status-display.component.html',
  styleUrls: ['./combined-status-display.component.css']
})
export default class CombinedStatusDisplayComponent {
  mobileThreshold = 1070;
  isMobile = window.innerWidth < this.mobileThreshold;
  lightsOn = window.innerWidth >= 1120;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
    this.lightsOn = window.innerWidth >= 1120;
  }
}
