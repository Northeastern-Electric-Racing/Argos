import { Component, HostListener } from '@angular/core';
import { allSegments } from 'src/utils/bms.utils';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { BmsHeaderComponent } from './components/bms-header/bms-header.component';
import { BmsAtAGlanceComponent } from './components/bms-at-a-glance/bms-at-a-glance.component';
import { SegmentSummaryComponent } from './components/segment-summary/segment-summary.component';
import { CellByCellHeatMapComponent } from './components/cell-by-cell-heat-map/cell-by-cell-heat-map.component';

@Component({
  selector: 'app-bms-debug-page',
  templateUrl: './bms-debug-page.component.html',
  styleUrl: './bms-debug-page.component.css',
  standalone: true,
  imports: [
    MatGridList,
    MatGridTile,
    BmsHeaderComponent,
    BmsAtAGlanceComponent,
    SegmentSummaryComponent,
    CellByCellHeatMapComponent
  ]
})
export class BmsDebugPageComponent {
  time = new Date();
  newRunIsLoading = false;
  mobileThreshold = 768;
  windowSize: number = window.innerWidth;
  isMobile = window.innerWidth < this.mobileThreshold;
  segments = allSegments;

  constructor() {}

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
    this.windowSize = window.innerWidth;
  }
}
