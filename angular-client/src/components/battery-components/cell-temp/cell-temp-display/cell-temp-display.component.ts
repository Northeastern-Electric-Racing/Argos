import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'cell-temp-display',
  templateUrl: './cell-temp-display.component.html',
  styleUrls: ['./cell-temp-display.component.css']
})
export default class CellTempDisplay {
  avgTemp: number = 0;
  maxTemp: number = 0;

  // -------- Commented out for now, until mobile view is implemented -----//
  // mobileThreshold = 1000;
  // isDesktop = window.innerWidth > this.mobileThreshold;
  // @HostListener('window:resize', ['$event'])
  // onResize() {
  //   this.isDesktop = window.innerWidth >= this.mobileThreshold;
  // }

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.CELL_TEMP_HIGH).subscribe((value) => {
      this.maxTemp = floatPipe(value.values[0]);
    });
    this.storage.get(IdentifierDataType.CELL_TEMP_AVG).subscribe((value) => {
      this.avgTemp = floatPipe(value.values[0]);
    });
  }
}
