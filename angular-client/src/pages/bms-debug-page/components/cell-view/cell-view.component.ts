import { Component, HostListener, inject, input } from '@angular/core';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { CellReading } from 'src/services/cell.service';
import { HeatMapService } from 'src/services/heat-map.service';
import { chipToString, Segment } from 'src/utils/bms.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';

import { InfoValueDisplayComponent } from '../../../../components/info-value-dispaly/info-value-display.component';
import { DividerComponent } from '../../../../components/divider/divider';
import HStackComponent from 'src/components/hstack/hstack.component';
import VStackComponent from 'src/components/vstack/vstack.component';

@Component({
  selector: 'cell-view',
  templateUrl: './cell-view.component.html',
  styleUrl: './cell-view.component.css',
  standalone: true,
  imports: [InfoBackgroundComponent, InfoValueDisplayComponent, DividerComponent, HStackComponent, VStackComponent]
})
export class CellViewComponent {
  private heatMapService = inject(HeatMapService);
  cellViewData: CellReading | undefined = undefined;
  screenWidth = window.innerWidth;
  forSegment = input.required<Segment>();
  segment: Segment;
  public config = inject(DynamicDialogConfig);

  // Update view width
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.screenWidth = window.innerWidth;
  }

  constructor() {
    this.segment = this.config.data.forSegment;
    this.heatMapService.getSelectedCell(this.segment)?.subscribe((data) => {
      this.cellViewData = data;
    });
  }

  // ngOnInit(): void {
  //   this.segment = this.forSegment();
  //   this.heatMapService.getSelectedCell(this.segment)?.subscribe((data) => {
  //     console.log('data', data);
  //     this.cellViewData = data;
  //   });
  // }

  getTitle = (): string => {
    const title = `Seg ${this.segment + 1}: Cell View`;
    return title;
  };

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
