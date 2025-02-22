import { Component, HostListener, OnInit } from '@angular/core';

@Component({
  selector: 'app-bms-debug-page',
  templateUrl: './bms-debug-page.component.html',
  styleUrl: './bms-debug-page.component.css'
})
export class BmsDebugPageComponent implements OnInit {
  time = new Date();
  newRunIsLoading = false;
  mobileThreshold = 768;
  isMobile = window.innerWidth < this.mobileThreshold;

  constructor() {}

  ngOnInit() {
    console.log('BMS Debug Page');
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
