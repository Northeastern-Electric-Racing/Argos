import { Component, input } from '@angular/core';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';

import { SegmentSelectorComponent } from '../segment-selector/segment-selector.component';
import { CRCComponent } from '../crc/crc.component';
import { BmsOverflowComponent } from '../bms-overflow/bms-overflow.component';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'bms-header',
  host: { '(window:resize)': 'onResize()' },
  templateUrl: './bms-header.component.html',
  styleUrl: './bms-header.component.css',
  standalone: true,
  imports: [MatGridList, MatGridTile, SegmentSelectorComponent, CRCComponent, BmsOverflowComponent, TypographyComponent]
})
export class BmsHeaderComponent {
  pageTitle = input.required<string>();
  time = new Date();
  newRunIsLoading = false;
  mobileThreshold = 768;
  windowSize: number = window.innerWidth;
  isMobile = window.innerWidth < this.mobileThreshold;

  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
    this.windowSize = window.innerWidth;
  }
}
