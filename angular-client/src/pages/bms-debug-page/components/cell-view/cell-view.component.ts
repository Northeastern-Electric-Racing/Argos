import { ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { SelectedCellInfo } from 'src/services/heat-map.service';
import { CellReading } from 'src/services/cell.service';
import { Chip, chipToString } from 'src/utils/bms.utils';

export interface CellViewRow {
  label: string;
  getValue: (reading: CellReading) => string;
  getClass?: (reading: CellReading) => string;
}

const DEFAULT_ROWS: CellViewRow[] = [
  {
    label: 'Voltage',
    getValue: (r) => (r.voltage !== undefined ? `${r.voltage.toFixed(3)} V` : '-')
  },
  {
    label: 'Temp',
    getValue: (r) => (r.temp !== undefined && r.temp !== null ? `${r.temp.toFixed(1)} \u00b0C` : '-')
  },
  {
    label: 'Balancing',
    getValue: (r) => (r.balancing === undefined ? '-' : r.balancing ? 'Yes' : 'No'),
    getClass: (r) => (r.balancing === true ? 'bal-yes' : r.balancing === false ? 'bal-no' : '')
  }
];

@Component({
  selector: 'cell-view',
  templateUrl: './cell-view.component.html',
  styleUrl: './cell-view.component.css',
  standalone: true,
  imports: []
})
export class CellViewComponent implements OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private refreshInterval: ReturnType<typeof setInterval> | undefined;
  public config = inject(DynamicDialogConfig);

  /** Shared array reference — additions/removals by SegmentHeatmapComponent
   *  are visible here because it's the same array object. */
  cells: SelectedCellInfo[];
  rows: CellViewRow[] = DEFAULT_ROWS;

  constructor() {
    this.cells = this.config.data.cells;
    // Poll for MQTT value changes and selection array changes.
    this.refreshInterval = setInterval(() => this.cdr.detectChanges(), 500);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  chipLabel(chip: Chip): string {
    return chipToString(chip, true);
  }
}
