import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'combined-status-display',
  templateUrl: './combined-status-display.component.html',
  styleUrls: ['./combined-status-display.component.css']
})
export default class CombinedStatusDisplay {
  mobileThreshold = 1000;
  isMobile = window.innerWidth < this.mobileThreshold;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
