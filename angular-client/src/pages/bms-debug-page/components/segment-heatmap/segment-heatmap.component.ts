import { Component, effect, inject, input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Chip, Segment } from 'src/utils/bms.utils';
import { HeatMapService, HeatMapView, SelectedCellInfo } from 'src/services/heat-map.service';
import { CellReading, CellService } from 'src/services/cell.service';
import { ALPHA_THERM_CELL_MAP, BETA_THERM_CELL_MAP } from 'src/utils/bms.config';
import { DialogService } from 'primeng/dynamicdialog';
import { CellViewComponent } from '../cell-view/cell-view.component';
import { HexTileComponent } from '../hex-tile/hex-tile.component';

export interface DisplayCell {
  reading: CellReading;
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
      reading: cell,
      value: this.getCellValue(cell),
      boolValue: this.getCellBoolValue(cell),
      cellLabel: cell.cellNumber.toString(),
      cellCount: 1
    }));
  }

  /** Group cells by therm mapping into combined DisplayCells */
  private toThermDisplayCells(cells: Readonly<CellReading[]>, thermMap: number[][]): DisplayCell[] {
    return thermMap.map((cellIndices) => {
      const primary = cells[cellIndices[0]];
      const label = cellIndices.join(',');
      return {
        reading: primary,
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
    const segment = this.segment();

    // In temperature view, find therm group and add all member cells.
    // The therm map is chosen based on the reading's chip (Alpha or Beta)
    // so the correct mapping is used regardless of which row was clicked.
    if (this.view === HeatMapView.Temperature) {
      const { cellNumber: cellNum, chip } = displayCell.reading;
      const thermMap = chip === Chip.Alpha ? ALPHA_THERM_CELL_MAP : BETA_THERM_CELL_MAP;
      const cells = chip === Chip.Alpha ? this.alphaCells : this.betaCells;

      // Find which therm group this cell belongs to
      const group = thermMap.find((indices) => indices.includes(cellNum)) ?? [cellNum];

      // Check if any cell in the group is already selected — if so, toggle all off
      const anySelected = group.some((idx) => cells[idx] && this.heatMapService.isCellSelected(cells[idx]));

      for (const idx of group) {
        const reading = cells[idx];
        if (!reading) continue;
        const info: SelectedCellInfo = { reading, cellNum: idx.toString(), segment };
        if (anySelected) {
          // Remove if present
          const i = this.heatMapService.selectedCells.findIndex((s) => s.reading === reading);
          if (i >= 0) this.heatMapService.selectedCells.splice(i, 1);
        } else if (!this.heatMapService.isCellSelected(reading)) {
          this.heatMapService.selectedCells.push(info);
        }
      }
    } else {
      const info: SelectedCellInfo = {
        reading: displayCell.reading,
        cellNum: displayCell.cellLabel,
        segment
      };
      this.heatMapService.toggleCell(info);
    }

    // Open dialog on first selection
    if (this.heatMapService.selectedCells.length > 0 && !this.heatMapService.dialogRef) {
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
    } else if (this.heatMapService.selectedCells.length === 0 && this.heatMapService.dialogRef) {
      // Close dialog when all cells deselected
      this.heatMapService.dialogRef.close();
    }
  }

  isSelected(cell: CellReading): boolean {
    return this.heatMapService.isCellSelected(cell);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
