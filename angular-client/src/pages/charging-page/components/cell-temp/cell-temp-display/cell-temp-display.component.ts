import { Component, HostListener } from '@angular/core';
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
  resetGraph: boolean = false;
  resetGraphButton = {
    onClick: () => {
      this.resetGraph = true;
    },
    icon: 'restart_alt'
  };
  mobileThreshold = 1200;
  isDesktop = window.innerWidth > this.mobileThreshold;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isDesktop = window.innerWidth >= this.mobileThreshold;
  }

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.CELL_TEMP_HIGH).subscribe((value) => {
      this.resetGraph = false; //!!!! FOR REVIEW !!!!: is there a better way to do this reseting of the graph boolean?
      this.maxTemp = floatPipe(value.values[0]);
    });
    this.storage.get(IdentifierDataType.CELL_TEMP_AVG).subscribe((value) => {
      this.resetGraph = false;
      this.avgTemp = floatPipe(value.values[0]);
    });
  }
}
