import { Component, HostListener, inject, OnInit } from '@angular/core';
import {
  BatteryConfig,
  ConnectionDotConfig,
  ThermometerConfig
} from 'src/components/info-value-dispaly/info-value-display.component';
import { DataTypeEnum } from 'src/data-type.enum';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'segment-at-a-glance',
  templateUrl: './segment-at-a-glance.component.html',
  styleUrl: './segment-at-a-glance.component.css'
})
export class SegmentAtAGlanceComponent {
  private storage = inject(Storage);
  voltage: number = 0;
  temperature: number = 0;
  chip_alpha_temp: number = 0;
  chip_beta_temp: number = 0;
  crc: number = 0;
  thermometerConfig: ThermometerConfig = { type: 'thermometer-config', currentValue: 0, min: -15, max: 30 };
  batteryConfig: BatteryConfig = { type: 'battery-config', percentage: 0, height: 50, width: 25 };
  getStatusMessage = (): string => {
    return '';
  };
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
  }
}
