import { Component, HostListener } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { decimalPipe, floatPipe } from 'src/utils/pipes.utils';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'cell-temp-display',
  templateUrl: './cell-temp-display.component.html',
  styleUrls: ['./cell-temp-display.component.css']
})
export default class CellTempDisplay {
  avgTemp: number = 0;
  maxTemp: number = 0;
  resetGraphButton = {
    onClick: () => {
      this.cellTempData = [];
    },
    icon: 'restart_alt'
  };
  cellTempData: GraphData[] = [];
  mobileThreshold = 1070;
  isDesktop = window.innerWidth > this.mobileThreshold;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isDesktop = window.innerWidth >= this.mobileThreshold;
  }

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.CELL_TEMP_HIGH).subscribe((value) => {
      this.maxTemp = floatPipe(value.values[0]);
      this.cellTempData.push({ x: decimalPipe(value.time), y: this.maxTemp });
    });
    this.storage.get(IdentifierDataType.CELL_TEMP_AVG).subscribe((value) => {
      this.avgTemp = floatPipe(value.values[0]);
    });
  }
}
