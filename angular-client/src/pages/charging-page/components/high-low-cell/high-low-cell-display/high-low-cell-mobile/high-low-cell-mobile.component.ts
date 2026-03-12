import { Component, Input, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { GraphData } from 'src/utils/types.utils';
import { InfoBackgroundComponent } from '../../../../../../components/info-background/info-background.component';

import { DividerComponent } from '../../../../../../components/divider/divider';
import HighLowCellGraphComponent from '../../high-low-cell-graph/high-low-cell-graph.component';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import VStackComponent from 'src/components/vstack/vstack.component';

@Component({
  selector: 'high-low-cell-mobile',
  templateUrl: './high-low-cell-mobile.component.html',
  styleUrls: ['./high-low-cell-mobile.component.css'],
  standalone: true,
  imports: [
    InfoBackgroundComponent,
    DividerComponent,
    HighLowCellGraphComponent,
    TypographyComponent,
    HStackComponent,
    VStackComponent
  ]
})
export default class HighLowCellMobileComponent {
  private storage = inject(Storage);
  @Input() delta: number = 0;
  @Input() lowCellVoltage: number = 0;
  @Input() highCellVoltage: number = 0;
  mobileThreshold = 1070;
  isDesktop = window.innerWidth > this.mobileThreshold;
  @Input() highVoltsData: GraphData[] = [];
  @Input() lowVoltsData: GraphData[] = [];
  @Input() resetGraphButton = {
    onClick: () => {
      this.highVoltsData = [];
      this.lowVoltsData = [];
    },
    icon: 'restart_alt'
  };
}
