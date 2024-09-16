import { Component, HostListener } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { decimalPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'high-low-cell-display',
  templateUrl: './high-low-cell-display.component.html',
  styleUrls: ['./high-low-cell-display.component.css']
})
export default class HighLowCellDisplay {
  delta: number = 0;
  lowCellVoltage: number = 0;
  highCellVoltage: number = 0;
  mobileThreshold = 1200;
  isDesktop = window.innerWidth > this.mobileThreshold;
  resetGraph: boolean = false;
  resetGraphButton = {
    onClick: () => {
      this.resetGraph = true;
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
      if (this.resetGraph) {
        this.resetGraph = false;
      }
      this.lowCellVoltage = decimalPipe(value.values[0], 3);
      this.delta = decimalPipe((this.highCellVoltage - this.lowCellVoltage).toFixed(3), 3);
    });
    this.storage.get(IdentifierDataType.VOLTS_HIGH).subscribe((value) => {
      if (this.resetGraph) {
        this.resetGraph = false;
      }
      this.highCellVoltage = decimalPipe(value.values[0], 3);
      this.delta = decimalPipe((this.highCellVoltage - this.lowCellVoltage).toFixed(3), 3);
    });
  }
}
