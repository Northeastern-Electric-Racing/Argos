import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectorRef, Component, inject, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { SelectedCellInfo } from 'src/services/heat-map.service';
import { CellReading } from 'src/services/cell.service';
import { chipToString } from 'src/utils/bms.utils';
import { ConfigTableComponent, TableRowConfig, TableColumnConfig } from 'src/components/config-table/config-table.component';
import { tw } from 'src/ui/recipes/tw';

/**
 * Value colours on the panel (surface-2), text tokens at AA: balancing blue and CvS red were #4169e1 and #dc2626
 * text (about 3.1:1), now the info and accent text tokens; "No" and "False" take warn and success.
 */
const valueColour = {
  balancing: tw('text-info'),
  notBalancing: tw('text-warn'),
  failed: tw('text-accent-fg'),
  passed: tw('text-success')
} as const;

const DEFAULT_ROW_CONFIG: TableRowConfig<SelectedCellInfo>[] = [
  {
    label: 'Voltage',
    getValue: (c) => (c.reading.voltage !== undefined ? `${c.reading.voltage.toFixed(3)} V` : '-')
  },
  {
    label: 'Temp',
    getValue: (c) => (c.reading.temp !== undefined && c.reading.temp !== null ? `${c.reading.temp.toFixed(1)} \u00b0C` : '-')
  },
  {
    label: 'Balancing',
    getValue: (c) => (c.reading.balancing === undefined ? '-' : c.reading.balancing ? 'Yes' : 'No'),
    getClass: (c) =>
      c.reading.balancing === true ? valueColour.balancing : c.reading.balancing === false ? valueColour.notBalancing : ''
  },
  {
    label: 'CvS Failure',
    getValue: (c) => (c.reading.cvs === undefined ? '-' : c.reading.cvs ? 'True' : 'False'),
    getClass: (c) => (c.reading.cvs === true ? valueColour.failed : c.reading.cvs === false ? valueColour.passed : '')
  }
];

const COLUMN_CONFIG: TableColumnConfig<SelectedCellInfo> = {
  title: (c) => c.cellNum.toString(),
  subtitle: (c) => `${chipToString(c.reading.chip, true)} \u00b7 S${c.segment + 1}`
};

@Component({
  selector: 'cell-view',
  templateUrl: './cell-view.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ConfigTableComponent],
  host: { class: 'block' }
})
export class CellViewComponent implements OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private refreshInterval: ReturnType<typeof setInterval> | undefined;
  public dialogData = inject(DIALOG_DATA);

  /** Shared Map reference — mutations by SegmentHeatmapComponent
   *  are visible here because it's the same Map object. */
  private cellsMap: Map<CellReading, SelectedCellInfo>;
  rows = DEFAULT_ROW_CONFIG;
  columnConfig = COLUMN_CONFIG;

  get cells(): SelectedCellInfo[] {
    return Array.from(this.cellsMap.values());
  }

  constructor() {
    this.cellsMap = this.dialogData.cells;
    // Poll for MQTT value changes and selection array changes.
    this.refreshInterval = setInterval(() => this.cdr.detectChanges(), 50);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
