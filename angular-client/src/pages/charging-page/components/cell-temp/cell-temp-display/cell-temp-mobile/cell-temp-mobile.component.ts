import { Component, inject, input } from '@angular/core';
import Storage from 'src/services/storage.service';

import { GraphData } from 'src/utils/types.utils';
import { InfoBackgroundComponent } from '../../../../../../components/info-background/info-background.component';

import { DividerComponent } from '../../../../../../components/divider/divider';
import CellTempGraphComponent from '../../cell-temp-graph/cell-temp-graph.component';
import TypographyComponent from 'src/components/typography/typography.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'cell-temp-mobile',
  templateUrl: './cell-temp-mobile.component.html',
  styleUrls: ['./cell-temp-mobile.component.css'],
  standalone: true,
  imports: [
    InfoBackgroundComponent,
    DividerComponent,
    CellTempGraphComponent,
    TypographyComponent,
    VStackComponent,
    HStackComponent
  ]
})
export default class CellTempMobileComponent {
  private storage = inject(Storage);
  avgTemp = input<number>(0);
  maxTemp = input<number>(0);
  resetGraphButton = input<{ onClick: () => void; icon: string }>({
    onClick: () => {},
    icon: 'restart_alt'
  });
  cellTempData = input<GraphData[]>([]);
}
