import { Component, HostListener, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { floatPipe } from 'src/utils/pipes.utils';
import { GraphData } from 'src/utils/types.utils';
import { InfoBackgroundComponent } from '../../../../../components/info-background/info-background.component';
import PackVoltageMobileDisplayComponent from './pack-voltage-mobile/pack-voltage-mobile.component';
import PackVoltageGraphComponent from '../pack-voltage-graph/pack-voltage-graph.component';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'pack-voltage-display',
  templateUrl: './pack-voltage-display.component.html',
  styleUrls: ['./pack-voltage-display.component.css'],
  standalone: true,
  imports: [
    InfoBackgroundComponent,
    PackVoltageMobileDisplayComponent,
    PackVoltageGraphComponent,
    TypographyComponent,
    HStackComponent
  ]
})
export default class PackVoltageDisplayComponent implements OnInit {
  private storage = inject(Storage);
  voltage: number = 0;
  packVoltData: GraphData[] = [];
  resetGraphButton = {
    onClick: () => {
      this.packVoltData = [];
    },
    icon: 'restart_alt'
  };
  mobileThreshold = 1070;
  isDesktop = window.innerWidth > this.mobileThreshold;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isDesktop = window.innerWidth >= this.mobileThreshold;
  }

  ngOnInit() {
    this.storage.get(DataTypeEnum.PACK_VOLTAGE).subscribe((value) => {
      this.voltage = floatPipe(value.values[0]);
      this.packVoltData.push({ x: +value.time, y: this.voltage });
    });
  }
}
