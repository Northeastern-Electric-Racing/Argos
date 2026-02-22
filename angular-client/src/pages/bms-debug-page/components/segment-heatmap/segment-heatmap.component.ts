import { Component, effect, inject, input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Segment } from 'src/utils/bms.utils';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';
import { CellReading, CellService } from 'src/services/cell.service';
import { DialogService } from 'primeng/dynamicdialog';
import { CellViewComponent } from '../cell-view/cell-view.component';
import { HexTileComponent } from '../hex-tile/hex-tile.component';

export interface DisplayCell {
  reading: CellReading;
  value: number | undefined;
  boolValue: boolean | undefined;
  cellNum: string;
}

@Component({
  selector: 'segment-heatmap',
  templateUrl: './segment-heatmap.component.html',
  styleUrl: './segment-heatmap.component.css',
  standalone: true,
  imports: [HexTileComponent]
})
export class SegmentHeatmapComponent implements OnInit, OnDestroy {
  private cellService = inject(CellService);
  private heatMapService = inject(HeatMapService);
  private dialogService = inject(DialogService);
  private subscriptions: Subscription[] = [];

  segment = input.required<Segment>();

  alphaCells!: Readonly<CellReading[]>;
  betaCells!: Readonly<CellReading[]>;
  view = HeatMapView.Voltage;
  selectedCell: CellReading | undefined = undefined;

  constructor() {
    effect(() => {
      this.alphaCells = this.cellService.getAlphaCellsBySegment(this.segment());
      this.betaCells = this.cellService.getBetaCellsBySegment(this.segment());
    });
  }

  ngOnInit(): void {
    this.alphaCells = this.cellService.getAlphaCellsBySegment(this.segment());
    this.betaCells = this.cellService.getBetaCellsBySegment(this.segment());

    const viewSub = this.heatMapService.getCurrentView(this.segment());
    if (viewSub) {
      this.subscriptions.push(
        viewSub.subscribe((view) => {
          this.view = view;
        })
      );
    }
  }

  get topRowCells(): DisplayCell[] {
    const cells: DisplayCell[] = [];
    const reversed = this.betaCells.slice().reverse();

    for (let i = 0; i < reversed.length; i++) {
      const cell = reversed[i];
      cells.push({
        reading: cell,
        value: this.getCellValue(cell),
        boolValue: this.getCellBoolValue(cell),
        cellNum: (reversed.length - 1 - i).toString()
      });
    }
    return cells;
  }

  get bottomRowCells(): DisplayCell[] {
    const cells: DisplayCell[] = [];

    for (let i = 0; i < this.alphaCells.length; i++) {
      const cell = this.alphaCells[i];
      cells.push({
        reading: cell,
        value: this.getCellValue(cell),
        boolValue: this.getCellBoolValue(cell),
        cellNum: i.toString()
      });
    }
    return cells;
  }

  private getCellValue(cell: CellReading): number | undefined {
    if (this.view === HeatMapView.Temperature) return cell.temp;
    if (this.view === HeatMapView.Voltage) return this.averageVolt(cell);
    return undefined;
  }

  private getCellBoolValue(cell: CellReading): boolean | undefined {
    if (this.view !== HeatMapView.Balancing) return undefined;
    if (cell.balancing1 === undefined && cell.balancing2 === undefined) return undefined;
    return !!(cell.balancing1 || cell.balancing2);
  }

  private averageVolt(cell: CellReading): number | undefined {
    if (cell.volt1 === undefined) return cell.volt2;
    if (cell.volt2 === undefined) return cell.volt1;
    return (cell.volt1 + cell.volt2) / 2;
  }

  getColor(cell: DisplayCell): string {
    if (this.view === HeatMapView.Balancing) return this.getBalancingColor(cell.boolValue);
    if (this.view === HeatMapView.Temperature) return this.getTempColor(cell.value);
    return this.getVoltColor(cell.value);
  }

  private getTempColor(value: number | undefined): string {
    if (value === undefined) return 'grey';
    const hsl = Math.min(Math.max(55 - value, 0) * 6, 120);
    return `hsl(${hsl}, 100%, 50%)`;
  }

  private getVoltColor(value: number | undefined): string {
    if (value === undefined) return 'grey';
    const hsl = Math.min(Math.max((value - 3.0) * 200, 0), 120);
    return `hsl(${hsl}, 100%, 50%)`;
  }

  private getBalancingColor(value: boolean | undefined): string {
    if (value === undefined) return 'grey';
    return value ? '#4169e1' : 'yellow';
  }

  cellClicked(cell: CellReading, displayIndex: string): void {
    this.selectedCell = cell;
    this.heatMapService.setSelectedCell(cell);
    const ref = this.dialogService.open(CellViewComponent, {
      data: { forSegment: this.segment(), displayCellIndex: displayIndex },
      width: '40%',
      draggable: true,
      closable: true,
      closeAriaLabel: 'Close'
    });
    ref.onClose.subscribe(() => (this.selectedCell = undefined));
  }

  isSelected(cell: CellReading): boolean {
    return this.selectedCell === cell;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
