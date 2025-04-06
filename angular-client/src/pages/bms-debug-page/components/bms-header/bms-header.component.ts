import { Component, HostListener, input, OnInit } from '@angular/core';

@Component({
  selector: 'bms-header',
  templateUrl: './bms-header.component.html',
  styleUrl: './bms-header.component.css'
})
export class BmsHeaderComponent implements OnInit {
  pageTitle = input.required<string>();
  time = new Date();
  newRunIsLoading = false;
  mobileThreshold = 768;
  windowSize: number = window.innerWidth;
  isMobile = window.innerWidth < this.mobileThreshold;

  constructor() {}

  ngOnInit() {
    console.log('BMS Debug Page');
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
    this.windowSize = window.innerWidth;
  }
}
