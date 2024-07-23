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
  lowCellVolts: number = 0;
  highCellVolts: number = 0;
  mobileThreshold = 1000;
  isDesktop = window.innerWidth > this.mobileThreshold;

  constructor(private storage: Storage) {}

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isDesktop = window.innerWidth >= this.mobileThreshold;
  }

  ngOnInit() {
    this.storage.get(IdentifierDataType.VOLTS_HIGH).subscribe((value) => {
      this.lowCellVolts = decimalPipe(value.values[0]);
      this.delta = decimalPipe((this.highCellVolts - this.lowCellVolts).toFixed(1));
    });
    this.storage.get(IdentifierDataType.VOLTS_LOW).subscribe((value) => {
      this.highCellVolts = decimalPipe(value.values[0]);
      this.delta = decimalPipe((this.highCellVolts - this.lowCellVolts).toFixed(2));
    });
  }
}
