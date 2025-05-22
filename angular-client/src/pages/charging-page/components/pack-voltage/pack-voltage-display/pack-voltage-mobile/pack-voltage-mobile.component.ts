import { Component, Input, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { GraphData } from 'src/utils/types.utils';
import { InfoBackgroundComponent } from '../../../../../../components/info-background/info-background.component';
import PackVoltageDisplayComponent from '../pack-voltage-display.component';
import PackVoltageGraphComponent from '../../pack-voltage-graph/pack-voltage-graph.component';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import VStackComponent from 'src/components/vstack/vstack.component';

@Component({
  selector: 'pack-voltage-mobile',
  templateUrl: './pack-voltage-mobile.component.html',
  styleUrls: ['./pack-voltage-mobile.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, PackVoltageGraphComponent, TypographyComponent, HStackComponent, VStackComponent]
})
export default class PackVoltageMobileDisplayComponent {
  private storage = inject(Storage);
  @Input() voltage: number = 0;
  @Input() packVoltData: GraphData[] = [];
  resetGraphButton = {
    onClick: () => {
      this.packVoltData = [];
    },
    icon: 'restart_alt'
  };
}
