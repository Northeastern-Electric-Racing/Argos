import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CellReading } from './cell.service';
import { Segment } from 'src/utils/bms.utils';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CellViewComponent } from 'src/pages/bms-debug-page/components/cell-view/cell-view.component';

export enum HeatMapView {
  Voltage = 'Voltage',
  Temperature = 'Temperature',
  Balancing = 'Balancing',
  CvsFailure = 'CvS Failure'
}

export interface SelectedCellInfo {
  reading: CellReading;
  cellNum: number;
  segment: Segment;
}

@Injectable({
  providedIn: 'root'
})
export class HeatMapService {
  private dialogService = inject(DialogService);

  private currentViewMap: Map<Segment, BehaviorSubject<HeatMapView>> = new Map();

  /** Global default view — drives the "Set ALL Maps" selector and initial per-segment defaults */
  readonly globalView$ = new BehaviorSubject<HeatMapView>(HeatMapView.Voltage);

  /** Multi-cell selection state, keyed by CellReading identity */
  private selectedCells = new Map<CellReading, SelectedCellInfo>();
  dialogRef: DynamicDialogRef | null = null;

  /**
   * Toggle a group of readings as a unit. Uses the first reading's
   * selection state as the lead — if it is already selected every
   * reading in the list is deselected, otherwise all are selected.
   */
  toggleCells(readings: CellReading[], segment: Segment, useDialog: boolean = false): void {
    if (this.isCellSelected(readings[0])) {
      this.deselectCells(readings, useDialog);
    } else {
      this.selectCells(readings, segment, useDialog);
    }
  }

  /**
   * Select readings (no-op for already-selected readings). If useDialog is true, also opens a dialog showing the selected cells if not already open.
   */
  selectCells(readings: CellReading[], segment: Segment, useDialog: boolean): void {
    for (const reading of readings) {
      this.selectedCells.set(reading, { reading, cellNum: reading.cellNumber, segment });
    }

    if (useDialog) {
      this.openDialogForSelectedCells();
    }
  }

  openDialogForSelectedCells(): void {
    // Open dialog if not already open, and the caller requested it.
    if (this.selectedCells.size > 0 && !this.dialogRef) {
      this.dialogRef = this.dialogService.open(CellViewComponent, {
        data: { cells: this.selectedCells },
        header: 'Cell Comparison',
        draggable: true,
        closable: true,
        modal: false,
        closeAriaLabel: 'Close',
        styleClass: 'cell-compare-dialog'
      });
      this.dialogRef.onClose.subscribe(() => {
        this.clearSelection();
        this.dialogRef = null;
      });
    }
  }

  /**
   * Deselect readings (no-op for already-deselected readings). If useDialog is true, also closes the dialog if no cells remain selected.
   */
  deselectCells(readings: CellReading[], useDialog: boolean): void {
    for (const reading of readings) {
      this.selectedCells.delete(reading);
    }

    if (useDialog) {
      this.closeDialogIfNoSelection();
    }
  }

  closeDialogIfNoSelection(): void {
    // close dialog if no cells remain selected and the caller requested it.
    if (this.selectedCells.size === 0 && this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
  }

  clearSelection(): void {
    this.selectedCells.clear();
  }

  isCellSelected(reading: CellReading): boolean {
    return this.selectedCells.has(reading);
  }

  anySelected(readings: CellReading[]): boolean {
    return readings.some((r) => this.isCellSelected(r));
  }

  setCurrentView = (segment: Segment, view: HeatMapView) => {
    if (!this.currentViewMap.get(segment)) {
      this.currentViewMap.set(segment, new BehaviorSubject(view));
    }
    this.currentViewMap.get(segment)?.next(view);
  };

  getCurrentView = (segment: Segment) => {
    if (!this.currentViewMap.get(segment)) {
      this.currentViewMap.set(segment, new BehaviorSubject<HeatMapView>(this.globalView$.value));
    }
    return this.currentViewMap.get(segment);
  };

  setAllSegViews = (view: HeatMapView) => {
    this.globalView$.next(view);
    this.currentViewMap.forEach((subject) => {
      subject.next(view);
    });
  };

  getAllSegViews = () => {
    return this.currentViewMap.values();
  };
}
