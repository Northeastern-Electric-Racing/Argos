import { Component, HostListener } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { decimalPipe, floatPipe } from 'src/utils/pipes.utils';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'pack-voltage-display',
  templateUrl: './pack-voltage-display.component.html',
  styleUrls: ['./pack-voltage-display.component.css']
})
export default class PackVoltageDisplay {
  voltage: number = 0;
  packVoltData: GraphData[] = [];
  resetGraphButton = {
    onClick: () => {
      this.packVoltData = [];
    },
    icon: 'restart_alt'
  };
  mobileThreshold = 1070;
  isDesktop = window.innerWidth > this.mobileThreshold;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isDesktop = window.innerWidth >= this.mobileThreshold;
  }

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.PACK_VOLTAGE).subscribe((value) => {
      this.voltage = floatPipe(value.values[0]);
      this.packVoltData.push({ x: +value.time, y: this.voltage });
    });
  }
}
