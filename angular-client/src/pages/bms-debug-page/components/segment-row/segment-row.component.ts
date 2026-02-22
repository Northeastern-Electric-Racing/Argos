import { Component, effect, inject, input, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Segment, segmentInfoMap, SegmentInfo } from 'src/utils/bms.utils';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';
import { CellReading, CellService } from 'src/services/cell.service';
import { DialogService } from 'primeng/dynamicdialog';
import { CellViewComponent } from '../cell-view/cell-view.component';
import { HexTileComponent } from '../hex-tile/hex-tile.component';
import {
  DropdownOption,
  SelectorConfig,
  SelectDropdownComponent
} from 'src/components/select-dropdown/select-dropdown.component';
import Storage from 'src/services/storage.service';
import { appRoutes } from 'src/app/app-routing.module';

/** A single hex cell to render in the grid. */
export interface DisplayCell {
  reading: CellReading;
  value: number | undefined;
  boolValue: boolean | undefined;
  cellNum: string;
}

@Component({
  selector: 'segment-row',
  templateUrl: './segment-row.component.html',
  styleUrl: './segment-row.component.css',
  standalone: true,
  imports: [HexTileComponent, SelectDropdownComponent]
})
export class SegmentRowComponent implements OnInit, OnDestroy {
  private cellService = inject(CellService);
  private heatMapService = inject(HeatMapService);
  private dialogService = inject(DialogService);
  private storage = inject(Storage);
  private router = inject(Router);
  private subscriptions: Subscription[] = [];

  segment = input.required<Segment>();

  // Cell data
  alphaCells!: Readonly<CellReading[]>;
  betaCells!: Readonly<CellReading[]>;

  // Heat map view state
  view = HeatMapView.Voltage;
  selectedCell: CellReading | undefined = undefined;

  // Segment overview stats
  temperature!: number;
  voltage!: number;
  chipTemp!: number;

  // View selector config (Voltage and Balancing only per ticket)
  viewSelectorConfig!: SelectorConfig;
  private viewOptions: DropdownOption[] = [
    {
      name: HeatMapView.Voltage.toString(),
      function: () => this.heatMapService.setCurrentView(this.segment(), HeatMapView.Voltage)
    },
    {
      name: HeatMapView.Balancing.toString(),
      function: () => this.heatMapService.setCurrentView(this.segment(), HeatMapView.Balancing)
    }
  ];

  constructor() {
    effect(() => {
      this.alphaCells = this.cellService.getAlphaCellsBySegment(this.segment());
      this.betaCells = this.cellService.getBetaCellsBySegment(this.segment());
    });
  }

  ngOnInit(): void {
    this.alphaCells = this.cellService.getAlphaCellsBySegment(this.segment());
    this.betaCells = this.cellService.getBetaCellsBySegment(this.segment());

    // Subscribe to view changes
    this.viewSelectorConfig = { options: this.viewOptions, placeholder: 'Voltage' };
    const viewSub = this.heatMapService.getCurrentView(this.segment());
    if (viewSub) {
      this.subscriptions.push(
        viewSub.subscribe((view) => {
          this.view = view;
          this.viewSelectorConfig = {
            ...this.viewSelectorConfig,
            defaultValue: view !== undefined ? view : 'Voltage'
          };
        })
      );
    }

    // Subscribe to segment overview stats
    const info: SegmentInfo = segmentInfoMap[this.segment()];
    this.subscriptions.push(
      this.storage.get(info.segmentTempKey).subscribe((v) => (this.temperature = parseFloat(v.values[0]))),
      this.storage.get(info.voltageKey).subscribe((v) => (this.voltage = parseFloat(v.values[0]))),
      this.storage.get(info.alphaChipTempKey).subscribe((v) => (this.chipTemp = parseFloat(v.values[0])))
    );
  }

  // --- Display cell builders (1 hex per CellReading) ---

  /** Top row: beta cells reversed — one hex per CellReading. */
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

  /** Bottom row: alpha cells — one hex per CellReading. */
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

  /** Get the numeric value to display for a CellReading based on current view. */
  private getCellValue(cell: CellReading): number | undefined {
    if (this.view === HeatMapView.Temperature) return cell.temp;
    if (this.view === HeatMapView.Voltage) return this.averageVolt(cell);
    return undefined; // Balancing uses boolValue
  }

  /** Get the boolean value to display for a CellReading (balancing view). */
  private getCellBoolValue(cell: CellReading): boolean | undefined {
    if (this.view !== HeatMapView.Balancing) return undefined;
    // Show true if either voltage cell in the pair is balancing
    if (cell.balancing1 === undefined && cell.balancing2 === undefined) return undefined;
    return !!(cell.balancing1 || cell.balancing2);
  }

  /** Average of volt1 and volt2 for a CellReading. */
  private averageVolt(cell: CellReading): number | undefined {
    if (cell.volt1 === undefined) return cell.volt2;
    if (cell.volt2 === undefined) return cell.volt1;
    return (cell.volt1 + cell.volt2) / 2;
  }

  // --- Color helpers ---

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

  // --- Interactions ---

  cellClicked(cell: CellReading): void {
    this.selectedCell = cell;
    this.heatMapService.setSelectedCell(cell);
    const ref = this.dialogService.open(CellViewComponent, {
      data: { forSegment: this.segment() },
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

  openSegmentPage = (): void => {
    this.router.navigate([appRoutes.bmsSegmentViewRoute(this.segment())]);
  };

  formatTemp(): string {
    return this.temperature !== undefined ? this.temperature.toFixed(0) : '-';
  }

  formatVoltage(): string {
    return this.voltage !== undefined ? this.voltage.toFixed(1) : '-';
  }

  formatChipTemp(): string {
    return this.chipTemp !== undefined ? this.chipTemp.toFixed(0) : '-';
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
