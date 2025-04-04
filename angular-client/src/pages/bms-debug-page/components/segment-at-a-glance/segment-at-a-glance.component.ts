import { Component, effect, HostListener, inject, input } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConnectionDotConfig, ThermometerConfig } from 'src/components/info-value-dispaly/info-value-display.component';
import Storage from 'src/services/storage.service';
import { Chip, Segment } from 'src/utils/bms.utils';
import { dataTypes } from 'src/utils/topic.utils';

@Component({
  selector: 'segment-at-a-glance',
  templateUrl: './segment-at-a-glance.component.html',
  styleUrl: './segment-at-a-glance.component.css'
})
export class SegmentAtAGlanceComponent {
  private storage = inject(Storage);
  segmentNumber = input.required<Segment>();
  voltage: number = 0;
  temperature: number = 0;
  chip_alpha_temp: number = 0;
  chip_beta_temp: number = 0;
  alphaCrc: number = 0;
  thermometerConfig: ThermometerConfig = { type: 'thermometer-config', currentValue: 0, min: -15, max: 30 };
  valueSubscriptions: Subscription[] = [];

  constructor() {
    effect(() => {
      this.valueSubscriptions.forEach((sub) => sub.unsubscribe());
      this.resetValues();
      this.subscribeToData(this.segmentNumber());
    });
  }

  resetValues() {
    this.voltage = 0;
    this.temperature = 0;
    this.chip_alpha_temp = 0;
    this.chip_beta_temp = 0;
    this.alphaCrc = 0;
  }

  /*
  BMS/Segment_Temp/X where X is 1 thru 5 segment
Chip Alpha Temp: BMS/PerCell/Alpha/{4}/DieTemp {4} is chip 0 thru 4
Chip Beta Temp: BMS/PerCell/Beta/{4}/DieTemp {4} is chip 0 thru 4
CRCs: BMS/PerChip/PECErrorChip
  */

  subscribeToData = (segment: number) => {
    this.storage.get(dataTypes.segmentTemp(segment)).subscribe((value) => {
      this.temperature = parseFloat(value.values[0]);
      this.thermometerConfig.currentValue = this.temperature;
    });
    this.storage.get(dataTypes.dieTemp(segment, Chip.Alpha)).subscribe((value) => {
      this.chip_alpha_temp = parseFloat(value.values[0]);
    });
    this.storage.get(dataTypes.dieTemp(segment, Chip.Beta)).subscribe((value) => {
      this.chip_beta_temp = parseFloat(value.values[0]);
    });
  };

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
}
