import { ChangeDetectorRef, Component, HostListener, inject, input, OnDestroy } from '@angular/core';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { CellReading } from 'src/services/cell.service';
import { chipToString, Segment } from 'src/utils/bms.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';

import { InfoValueDisplayComponent } from '../../../../components/info-value-dispaly/info-value-display.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'cell-view',
  templateUrl: './cell-view.component.html',
  styleUrl: './cell-view.component.css',
  standalone: true,
  imports: [InfoBackgroundComponent, InfoValueDisplayComponent, HStackComponent]
})
export class CellViewComponent implements OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private refreshInterval: ReturnType<typeof setInterval> | undefined;
  cellViewData: CellReading | undefined = undefined;
  readingB: CellReading | undefined = undefined;
  screenWidth = window.innerWidth;
  forSegment = input.required<Segment>();
  segment: Segment;
  displayCellIndex: number | undefined;
  public config = inject(DynamicDialogConfig);

  // Update view width
  @HostListener('window:resize')
  onResize() {
    this.screenWidth = window.innerWidth;
  }

  constructor() {
    this.segment = this.config.data.forSegment;
    this.displayCellIndex =
      this.config.data.displayCellIndex !== undefined ? parseInt(this.config.data.displayCellIndex, 10) : undefined;
    this.cellViewData = this.config.data.readingA;
    this.readingB = this.config.data.readingB;
    // CellReading properties are mutated in-place by CellService as MQTT data arrives,
    // so we poll for changes to keep the dialog values up to date.
    this.refreshInterval = setInterval(() => this.cdr.detectChanges(), 500);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

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

  getAverageVoltage(): number | undefined {
    const v1 = this.cellViewData?.voltage;
    const v2 = this.readingB?.voltage;
    if (v1 === undefined && v2 === undefined) return undefined;
    if (v1 === undefined) return v2;
    if (v2 === undefined) return v1;
    return (v1 + v2) / 2;
  }

  getBalancing(): boolean | undefined {
    const b1 = this.cellViewData?.balancing;
    const b2 = this.readingB?.balancing;
    if (b1 === undefined && b2 === undefined) return undefined;
    return !!(b1 || b2);
  }
}
