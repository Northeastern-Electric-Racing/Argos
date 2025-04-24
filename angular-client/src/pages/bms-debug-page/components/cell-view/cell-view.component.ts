import { Component, HostListener, inject, input, OnInit } from '@angular/core';
import { CellReading } from 'src/services/cell.service';
import { HeatMapService } from 'src/services/heat-map.service';
import { chipToString, Segment } from 'src/utils/bms.utils';

@Component({
  selector: 'cell-view',
  templateUrl: './cell-view.component.html',
  styleUrl: './cell-view.component.css'
})
export class CellViewComponent implements OnInit {
  private heatMapService = inject(HeatMapService);
  cellViewData: CellReading | undefined = undefined;
  screenWidth = window.innerWidth;
  forSegment = input.required<Segment>();

  // Update view width
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.screenWidth = window.innerWidth;
  }

  ngOnInit(): void {
    this.heatMapService.getSelectedCell(this.forSegment())?.subscribe((data) => {
      this.cellViewData = data;
    });
  }

  getUpperRightTitle = (): string => {
    const smallChipLabel = this.screenWidth < 1200;

    const chipValue =
      this.cellViewData?.chip !== undefined ? chipToString(this.cellViewData?.chip, smallChipLabel) : 'No Value';

    const tempValue =
      this.cellViewData?.temp !== undefined && this.cellViewData?.temp !== null
        ? `${this.cellViewData?.temp?.toFixed(2)} °C`
        : 'No Value';

    const chipLabel = this.screenWidth <= 1100 ? `C:` : `Cell:`;
    const tempLabel = this.screenWidth <= 1100 ? `T:` : `Temp:`;
    const title = `${chipLabel} ${chipValue} | ${tempLabel} ${tempValue}`;

    return title;
  };

  getCellNumTitle = (): string => {
    const cellNumLabel = this.screenWidth <= 1100 ? `Cell` : `Cell Number`;
    return cellNumLabel;
  };

  getCellVoltageTitle = (): string => {
    const cellVoltageLabel = this.screenWidth <= 1100 ? `Volts` : `Voltage`;
    return cellVoltageLabel;
  };

  getBalancingTitle = (): string => {
    const balancingLabel = this.screenWidth <= 1100 ? `Bal.?` : `Balancing?`;
    return balancingLabel;
  };
}
