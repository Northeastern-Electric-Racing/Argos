import { Component, HostListener, OnInit } from '@angular/core';
import { SegmentSummarys } from '../segment-summary/segment-summary.component';

@Component({
  selector: 'bms-header',
  templateUrl: './bms-header.component.html',
  styleUrl: './bms-header.component.css'
})
export class BmsHeaderComponent implements OnInit {
  time = new Date();
  newRunIsLoading = false;
  mobileThreshold = 768;
  windowSize: number = window.innerWidth;
  isMobile = window.innerWidth < this.mobileThreshold;
  segments = [
    SegmentSummarys.Segment1,
    SegmentSummarys.Segment2,
    SegmentSummarys.Segment3,
    SegmentSummarys.Segment4,
    SegmentSummarys.Segment5
  ];

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
