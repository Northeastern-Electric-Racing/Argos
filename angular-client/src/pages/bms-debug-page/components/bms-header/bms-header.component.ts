import { Component, input, ChangeDetectionStrategy } from '@angular/core';

import { SegmentSelectorComponent } from '../segment-selector/segment-selector.component';
import { CRCComponent } from '../crc/crc.component';
import { BmsOverflowComponent } from '../bms-overflow/bms-overflow.component';
import TypographyComponent from 'src/components/typography/typography.component';
import { gridTileClass, tileGridClass } from 'src/ui/recipes/grid';

@Component({
  selector: 'bms-header',
  templateUrl: './bms-header.component.html',
  imports: [SegmentSelectorComponent, CRCComponent, BmsOverflowComponent, TypographyComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class BmsHeaderComponent {
  pageTitle = input.required<string>();
  /** 814's grid; these tiles let their content spill (the 96px title, the selects' cards). */
  protected readonly grid = tileGridClass();
  protected readonly titleTile = gridTileClass(3, 3, { clip: false });
  protected readonly tile = gridTileClass(1, 3, { clip: false });
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
