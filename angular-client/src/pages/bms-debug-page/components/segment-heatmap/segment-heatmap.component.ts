import { Component, effect, inject, input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Segment } from 'src/utils/bms.utils';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';
import { CellReading, CellService } from 'src/services/cell.service';
import { ALPHA_THERM_CELL_MAP, BETA_THERM_CELL_MAP } from 'src/utils/bms.config';
import { DialogService } from 'primeng/dynamicdialog';
import { CellViewComponent } from '../cell-view/cell-view.component';
import { HexTileComponent } from '../hex-tile/hex-tile.component';

export interface DisplayCell {
  /** All CellReadings this tile represents
   * (single cell or a group of cells sharing a single reading (e.g. temp)). */
  readings: CellReading[];
  value: number | undefined;
  boolValue: boolean | undefined;
  /** Display label — usually the cell number, or comma-separated numbers when
   *  multiple readings are combined (e.g. thermistor groups like "0,1"). */
  cellLabel: string;
  /** Number of physical hex tiles this DisplayCell occupies.
   *  1 = single hex, 2 = merged double-hex for thermistor readings. */
  cellCount: number;
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
  view!: HeatMapView;

  constructor() {
    effect(() => {
      this.alphaCells = this.cellService.getAlphaCellsBySegment(this.segment());
      this.betaCells = this.cellService.getBetaCellsBySegment(this.segment());

      // Initialize view from the service (ties it to the per-segment BehaviorSubject)
      const viewSub = this.heatMapService.getCurrentView(this.segment());
      if (viewSub) {
        this.view = viewSub.value;
      }
    });
  }

  ngOnInit(): void {
    const viewSub = this.heatMapService.getCurrentView(this.segment());
    if (viewSub) {
      this.subscriptions.push(
        viewSub.subscribe((view) => {
          this.view = view;
        })
      );
    }
  }

  /** Map each CellReading 1:1 to a DisplayCell */
  private toDisplayCells(cells: Readonly<CellReading[]>): DisplayCell[] {
    return cells.map((cell) => ({
      readings: [cell],
      value: this.getCellValue(cell),
      boolValue: this.getCellBoolValue(cell),
      cellLabel: cell.cellNumber.toString(),
      cellCount: 1
    }));
  }

  /** Group cells by therm mapping into combined DisplayCells */
  private toThermDisplayCells(cells: Readonly<CellReading[]>, thermMap: number[][]): DisplayCell[] {
    return thermMap.map((cellIndices) => {
      const groupReadings = cellIndices.filter((i) => !!cells[i]).map((i) => cells[i]);
      const [primary] = groupReadings;
      const label = cellIndices.join(',');
      return {
        readings: groupReadings,
        value: primary?.temp,
        boolValue: undefined,
        cellLabel: label,
        cellCount: cellIndices.length
      };
    });
  }

  /** Beta chip cells (top row in the hex grid, reversed to match physical layout) */
  get betaDisplayCells(): DisplayCell[] {
    if (this.view === HeatMapView.Temperature) {
      return this.toThermDisplayCells(this.betaCells, BETA_THERM_CELL_MAP).reverse();
    }
    return this.toDisplayCells(this.betaCells).reverse();
  }

  /** Alpha chip cells (bottom row in the hex grid) */
  get alphaDisplayCells(): DisplayCell[] {
    if (this.view === HeatMapView.Temperature) {
      return this.toThermDisplayCells(this.alphaCells, ALPHA_THERM_CELL_MAP);
    }
    return this.toDisplayCells(this.alphaCells);
  }

  private getCellValue(cell: CellReading): number | undefined {
    if (this.view === HeatMapView.Temperature) return cell.temp;
    if (this.view === HeatMapView.Voltage) return cell.voltage;
    return undefined;
  }

  private getCellBoolValue(cell: CellReading): boolean | undefined {
    if (this.view !== HeatMapView.Balancing) return undefined;
    return cell.balancing;
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

  cellClicked(displayCell: DisplayCell): void {
    this.heatMapService.toggleCells(displayCell.readings, displayCell.cellLabel, this.segment());

    // Open dialog on first selection
    if (this.heatMapService.selectedCells.size > 0 && !this.heatMapService.dialogRef) {
      this.heatMapService.dialogRef = this.dialogService.open(CellViewComponent, {
        data: { cells: this.heatMapService.selectedCells },
        header: 'Cell Comparison',
        draggable: true,
        closable: true,
        closeAriaLabel: 'Close',
        styleClass: 'cell-compare-dialog'
      });
      this.heatMapService.dialogRef.onClose.subscribe(() => {
        this.heatMapService.clearSelection();
        this.heatMapService.dialogRef = null;
      });
    } else if (this.heatMapService.selectedCells.size === 0 && this.heatMapService.dialogRef) {
      // Close dialog when all cells deselected
      this.heatMapService.dialogRef.close();
    }
  }

  isSelected(cell: DisplayCell): boolean {
    return cell.readings.some((r) => this.heatMapService.isCellSelected(r));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
