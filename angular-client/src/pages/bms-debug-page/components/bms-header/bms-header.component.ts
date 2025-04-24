import { Component, HostListener, input } from '@angular/core';

@Component({
  selector: 'bms-header',
  templateUrl: './bms-header.component.html',
  styleUrl: './bms-header.component.css'
})
export class BmsHeaderComponent {
  pageTitle = input.required<string>();
  time = new Date();
  newRunIsLoading = false;
  mobileThreshold = 768;
  windowSize: number = window.innerWidth;
  isMobile = window.innerWidth < this.mobileThreshold;

  constructor() {}

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
    this.windowSize = window.innerWidth;
  }
}
