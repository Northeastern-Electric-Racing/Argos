import { Component, HostListener, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { floatPipe } from 'src/utils/pipes.utils';
import { GraphData } from 'src/utils/types.utils';
import { dataTypes } from 'src/utils/topic.utils';

@Component({
  selector: 'cell-temp-display',
  templateUrl: './cell-temp-display.component.html',
  styleUrls: ['./cell-temp-display.component.css']
})
export default class CellTempDisplayComponent implements OnInit {
  private storage = inject(Storage);
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

  ngOnInit() {
    this.storage.get(dataTypes.highTempValue()).subscribe((value) => {
      this.maxTemp = floatPipe(value.values[0]);
      this.cellTempData.push({ x: +value.time, y: this.maxTemp });
    });
    this.storage.get(dataTypes.tempAvgValue()).subscribe((value) => {
      this.avgTemp = floatPipe(value.values[0]);
    });
  }
}
