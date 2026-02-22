import { ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { SelectedCellInfo } from 'src/services/heat-map.service';
import { Chip, chipToString } from 'src/utils/bms.utils';

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

  formatVoltage(v: number | undefined): string {
    return v !== undefined ? `${v.toFixed(3)} V` : '-';
  }

  formatTemp(t: number | undefined): string {
    return t !== undefined && t !== null ? `${t.toFixed(1)} °C` : '-';
  }

  formatBool(b: boolean | undefined): string {
    if (b === undefined) return '-';
    return b ? 'Yes' : 'No';
  }
}
