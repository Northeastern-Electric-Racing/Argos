import { Component, HostListener, inject, OnInit } from '@angular/core';
import {
  BatteryConfig,
  ConnectionDotConfig,
  ThermometerConfig
} from 'src/components/info-value-dispaly/info-value-display.component';
import { DataTypeEnum } from 'src/data-type.enum';
import Storage from 'src/services/storage.service';

// PACK_VOLTAGE
// PACK_TEMP
// STATE_OF_CHARGE
// PACK_CCL
// PACK_DCL

@Component({
  selector: 'bms-at-a-glance',
  templateUrl: './bms-at-a-glance.component.html',
  styleUrl: './bms-at-a-glance.component.css'
})
export class BmsAtAGlanceComponent implements OnInit {
  private storage = inject(Storage);
  voltage: number = 0;
  temperature: number = 0;
  chargeState: number = 0;
  ccl: number = 0;
  dcl: number = 0;
  thermometerConfig: ThermometerConfig = { type: 'thermometer-config', currentValue: 0, min: -15, max: 30 };
  batteryConfig: BatteryConfig = { type: 'battery-config', percentage: 0, height: 50, width: 25 };
  getStatusColor = (): string => {
    let dotColor: string;
    if (this.voltage <= 375) {
      // multiply by 3 * 125 cells for scalling
      dotColor = 'red';
    } else if (this.voltage <= 437.5) {
      // multiply by 3.5 * 125 cells for scalling
      dotColor = 'yellow';
    } else {
      // antyhing above 3.5 * 125 cells for scalling, is good
      dotColor = '#19ff30';
    }
    return dotColor;
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

    this.storage.get(DataTypeEnum.CHARGE_CURRENT_LIMIT).subscribe((value) => {
      this.ccl = parseInt(value.values[0]);
    });

    this.storage.get(DataTypeEnum.DISCHARGE_CURRENT_LIMIT).subscribe((value) => {
      this.dcl = parseInt(value.values[0]);
    });
  }
}
