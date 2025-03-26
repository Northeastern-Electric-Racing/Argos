import { Component, HostListener, OnInit } from '@angular/core';
import { Segment } from 'src/utils/bms.utils';

@Component({
  selector: 'app-bms-debug-page',
  templateUrl: './bms-debug-page.component.html',
  styleUrl: './bms-debug-page.component.css'
})
export class BmsDebugPageComponent implements OnInit {
  time = new Date();
  newRunIsLoading = false;
  mobileThreshold = 768;
  windowSize: number = window.innerWidth;
  isMobile = window.innerWidth < this.mobileThreshold;
  segments = [Segment.Segment1, Segment.Segment2, Segment.Segment3, Segment.Segment4, Segment.Segment5];

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
