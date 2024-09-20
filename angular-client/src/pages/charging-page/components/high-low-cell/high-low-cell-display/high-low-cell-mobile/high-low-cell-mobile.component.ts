import { Component, Input } from '@angular/core';
import Storage from 'src/services/storage.service';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'high-low-cell-mobile',
  templateUrl: './high-low-cell-mobile.component.html',
  styleUrls: ['./high-low-cell-mobile.component.css']
})
export default class HighLowCellMobile {
  @Input() delta: number = 0;
  @Input() lowCellVoltage: number = 0;
  @Input() highCellVoltage: number = 0;
  mobileThreshold = 1070;
  isDesktop = window.innerWidth > this.mobileThreshold;
  @Input() highVoltsData: GraphData[] = [];
  @Input() lowVoltsData: GraphData[] = [];
  @Input() resetGraphButton = {
    onClick: () => {
      this.highVoltsData = [];
      this.lowVoltsData = [];
    },
    icon: 'restart_alt'
  };

  constructor(private storage: Storage) {}

  ngOnInit() {}
}
