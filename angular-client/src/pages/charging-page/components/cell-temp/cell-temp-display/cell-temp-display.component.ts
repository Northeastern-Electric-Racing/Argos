import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { floatPipe } from 'src/utils/pipes.utils';
import { GraphData } from 'src/utils/types.utils';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../../../../../components/info-background/info-background.component';

import { DividerComponent } from '../../../../../components/divider/divider';
import CellTempMobileComponent from './cell-temp-mobile/cell-temp-mobile.component';
import CellTempGraphComponent from '../cell-temp-graph/cell-temp-graph.component';
import TypographyComponent from 'src/components/typography/typography.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'cell-temp-display',
  host: { '(window:resize)': 'onResize()' },
  templateUrl: './cell-temp-display.component.html',
  styleUrls: ['./cell-temp-display.component.css'],
  standalone: true,
  imports: [
    InfoBackgroundComponent,
    DividerComponent,
    CellTempMobileComponent,
    CellTempGraphComponent,
    TypographyComponent,
    VStackComponent,
    HStackComponent
  ]
})
export default class CellTempDisplayComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  avgTemp: number = 0;
  maxTemp: number = 0;
  resetGraphButton = {
    onClick: () => {
      this.cellTempData = [];
    },
    icon: 'restart_alt'
  };
  cellTempData: GraphData[] = [];
  mobileThreshold = 1070;
  isDesktop = window.innerWidth > this.mobileThreshold;

  onResize() {
    this.isDesktop = window.innerWidth >= this.mobileThreshold;
  }

  ngOnInit() {
    this.storage
      .get(topics.highTempValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.maxTemp = floatPipe(value.values[0]);
        this.cellTempData.push({ x: +value.time, y: this.maxTemp });
      });
    this.storage
      .get(topics.tempAvgValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.avgTemp = floatPipe(value.values[0]);
      });
  }
}
