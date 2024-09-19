import { Component, HostListener } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { decimalPipe } from 'src/utils/pipes.utils';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'high-low-cell-display',
  templateUrl: './high-low-cell-display.component.html',
  styleUrls: ['./high-low-cell-display.component.css']
})
export default class HighLowCellDisplay {
  delta: number = 0;
  lowCellVoltage: number = 0;
  highCellVoltage: number = 0;
  mobileThreshold = 1070;
  isDesktop = window.innerWidth > this.mobileThreshold;
  highVoltsData: GraphData[] = [];
  lowVoltsData: GraphData[] = [];
  resetGraphButton = {
    onClick: () => {
      this.highVoltsData = [];
      this.lowVoltsData = [];
    },
    icon: 'restart_alt'
  };

  constructor(private storage: Storage) {}

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isDesktop = window.innerWidth >= this.mobileThreshold;
  }

  ngOnInit() {
    this.storage.get(IdentifierDataType.VOLTS_LOW).subscribe((value) => {
      this.lowCellVoltage = decimalPipe(value.values[0], 3);
      this.delta = decimalPipe((this.highCellVoltage - this.lowCellVoltage).toFixed(3), 3);
      this.lowVoltsData.push({ x: new Date().getTime(), y: this.lowCellVoltage });
    });
    this.storage.get(IdentifierDataType.VOLTS_HIGH).subscribe((value) => {
      this.highCellVoltage = decimalPipe(value.values[0], 3);
      this.delta = decimalPipe((this.highCellVoltage - this.lowCellVoltage).toFixed(3), 3);
      this.highVoltsData.push({ x: new Date().getTime(), y: this.highCellVoltage });
    });
  }
}
