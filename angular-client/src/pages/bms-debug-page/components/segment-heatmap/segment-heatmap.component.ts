import { Component, computed, effect, inject, input, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Segment } from 'src/utils/bms.utils';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';
import { CellReading, CellService } from 'src/services/cell.service';
import { ALPHA_THERM_CELL_MAP, BETA_THERM_CELL_MAP } from 'src/utils/bms.config';
import { HexTileComponent } from '../hex-tile/hex-tile.component';
import { tw } from 'src/ui/recipes/tw';

/**
 * The hex grid's geometry, read by hex-tile: hex width (fluid), height (pointy-top, width x 1.155), the gap
 * between hexes, the beta row's half-hex stagger and the negative gap that interlocks the two rows.
 *   row   the segment rows on /bms
 *   page  the larger grid on /bms/segment/:id, centred in its card
 */
export const HEATMAP_SIZES = ['row', 'page'] as const;
export type HeatmapSize = (typeof HEATMAP_SIZES)[number];
const sizeClasses: Record<HeatmapSize, string> = {
  row: tw(
    'block w-fit min-w-fit flex-[0_1_auto] [--hex-gap:2px] [--hex-h:calc(var(--hex-w)*1.155)] [--hex-w:clamp(28px,4.1vw,76px)] [--row-gap:calc(var(--hex-h)*-0.2)] [--row-offset:calc(var(--hex-w)/2+2px)]'
  ),
  page: tw(
    'mx-auto block w-fit min-w-fit flex-[0_1_auto] [--hex-gap:3px] [--hex-h:calc(var(--hex-w)*1.155)] [--hex-w:clamp(60px,5.5vw,85px)] [--row-gap:calc(var(--hex-h)*-0.2)] [--row-offset:calc(var(--hex-w)/2+3px)]'
  )
};

/** Tile fills for the flag views and cells with no data: the theme's heat-map tokens (styles/theme.css), AA under
 *  the tiles' black text. */
export const HEAT_FILLS = {
  balancing: 'var(--color-heat-balancing)',
  notBalancing: 'var(--color-heat-idle)',
  failed: 'var(--color-heat-failed)',
  passed: 'var(--color-heat-passed)',
  noData: 'var(--color-heat-no-data)'
} as const;

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
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HexTileComponent],
  host: { '[class]': 'hostClass()' }
})
export class SegmentHeatmapComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cellService = inject(CellService);
  private heatMapService = inject(HeatMapService);

  segment = input.required<Segment>();
  size = input<HeatmapSize>('row');

  protected hostClass = computed(() => sizeClasses[this.size()]);

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
      viewSub.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((view) => {
        this.view = view;
      });
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
  private toThermDisplayCells(
    cells: Readonly<CellReading[]>,
    thermMap: number[][],
    reverseLabels: boolean = false
  ): DisplayCell[] {
    return thermMap.map((cellIndices) => {
      const groupReadings = cellIndices.filter((i) => !!cells[i]).map((i) => cells[i]);
      const [primary] = groupReadings;
      const ordered = reverseLabels ? [...cellIndices].reverse() : cellIndices;
      const label = ordered.join(',');
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
      return this.toThermDisplayCells(this.betaCells, BETA_THERM_CELL_MAP, true).reverse();
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
    if (this.view === HeatMapView.SVolts) return cell.svolts;
    return undefined;
  }

  private getCellBoolValue(cell: CellReading): boolean | undefined {
    if (this.view === HeatMapView.Balancing) return cell.balancing;
    if (this.view === HeatMapView.CvsFailure) return cell.cvs;
    if (this.view === HeatMapView.OpenWire) return cell.ow;
    return undefined;
  }

  getColor(cell: DisplayCell): string {
    if (this.view === HeatMapView.CvsFailure || this.view === HeatMapView.OpenWire)
      return this.getCvsFailureColor(cell.boolValue);
    if (this.view === HeatMapView.Balancing) return this.getBalancingColor(cell.boolValue);
    if (this.view === HeatMapView.Temperature) return this.getTempColor(cell.value);
    return this.getVoltColor(cell.value);
  }

  private getTempColor(value: number | undefined): string {
    if (value === undefined) return HEAT_FILLS.noData;
    const hsl = Math.min(Math.max(55 - value, 0) * 6, 120);
    return `hsl(${hsl}, 100%, 50%)`;
  }

  private getVoltColor(value: number | undefined): string {
    if (value === undefined) return HEAT_FILLS.noData;
    const hsl = Math.min(Math.max((value - 3.0) * 200, 0), 120);
    return `hsl(${hsl}, 100%, 50%)`;
  }

  private getBalancingColor(value: boolean | undefined): string {
    if (value === undefined) return HEAT_FILLS.noData;
    return value ? HEAT_FILLS.balancing : HEAT_FILLS.notBalancing;
  }

  private getCvsFailureColor(value: boolean | undefined): string {
    if (value === undefined) return HEAT_FILLS.noData;
    return value ? HEAT_FILLS.failed : HEAT_FILLS.passed;
  }

  cellClicked(displayCell: DisplayCell): void {
    this.heatMapService.toggleCells(displayCell.readings, this.segment(), true);
  }

  isSelected(cell: DisplayCell): boolean {
    return this.heatMapService.anySelected(cell.readings);
  }
}
