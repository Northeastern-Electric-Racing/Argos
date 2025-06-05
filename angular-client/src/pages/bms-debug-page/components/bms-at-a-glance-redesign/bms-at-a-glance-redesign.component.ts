import { Component, HostListener, inject, OnInit } from '@angular/core';
import {
  BatteryConfig,
  ConnectionDotConfig,
  ThermometerConfig
} from 'src/components/info-value-dispaly/info-value-display.component';
import { DataTypeEnum } from 'src/data-type.enum';
import Storage from 'src/services/storage.service';
import { getConnectionDotStatusColor } from 'src/utils/bms.utils';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';

import { InfoValueDisplayComponent } from '../../../../components/info-value-dispaly/info-value-display.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import { AccHighVoltageComponent } from '../acc-high-voltage/acc-high-voltage.component';
import { AccLowVoltageComponent } from '../acc-low-voltage/acc-low-voltage.component';
import { AccHighTempComponent } from '../acc-high-temp/acc-high-temp.component';

@Component({
  selector: 'bms-at-a-glance-redesign',
  templateUrl: './bms-at-a-glance-redesign.component.html',
  styleUrl: './bms-at-a-glance-redesign.component.css',
  standalone: true,
  imports: [
    InfoBackgroundComponent,
    InfoValueDisplayComponent,
    HStackComponent,
    AccHighVoltageComponent,
    AccLowVoltageComponent,
    AccHighTempComponent
  ]
})
export class BmsAtAGlanceReDesignComponent implements OnInit {
  private storage = inject(Storage);
  voltage: number = 0;
  temperature: number = 0;
  chargeState: number = 0;
  ccl: number = 0;
  dcl: number = 0;
  voltsHighValue: number = 0;
  voltsLowValue: number = 0;
  highTemp: number = 0;
  thermometerConfig: ThermometerConfig = { type: 'thermometer-config', currentValue: 0, min: -15, max: 30 };
  batteryConfig: BatteryConfig = { type: 'battery-config', percentage: 0, height: 50, width: 25 };
  getStatusColor = (): string => {
    return getConnectionDotStatusColor(this.voltage);
  };
  connectionDotConfig: ConnectionDotConfig = {
    type: 'connection-dot-config',
    getStatusColor: this.getStatusColor
  };
  enableWidgets = window.innerWidth >= 1000;
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.enableWidgets = window.innerWidth >= 1000;
  }

  ngOnInit(): void {
    this.storage.get(DataTypeEnum.PACK_VOLTAGE).subscribe((value) => {
      this.voltage = parseInt(value.values[0]);
    });

    this.storage.get(DataTypeEnum.PACK_TEMP).subscribe((value) => {
      this.temperature = parseInt(value.values[0]);
      this.thermometerConfig.currentValue = this.temperature;
    });

    this.storage.get(DataTypeEnum.STATE_OF_CHARGE).subscribe((value) => {
      this.chargeState = parseInt(value.values[0]);
      this.batteryConfig.percentage = this.chargeState;
    });

    this.storage.get(topics.accCCL()).subscribe((value) => {
      this.ccl = parseInt(value.values[0]);
    });

    this.storage.get(topics.accDCL()).subscribe((value) => {
      this.dcl = parseInt(value.values[0]);
    });

    this.storage.get(topics.highVoltsCell()).subscribe((value) => {
      this.voltsHighValue = parseInt(value.values[0]);
    });

    this.storage.get(topics.lowVoltsCell()).subscribe((value) => {
      this.voltsLowValue = parseInt(value.values[0]);
    });

    this.storage.get(topics.highTempCell()).subscribe((value) => {
      this.highTemp = parseInt(value.values[0]);
    });
  }
}
