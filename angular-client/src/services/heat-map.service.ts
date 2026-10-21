import { inject, Injectable, Injector } from '@angular/core';
import { BehaviorSubject, filter } from 'rxjs';
import { hasModifierKey } from '@angular/cdk/keycodes';
import { createGlobalPositionStrategy, createOverlayRef, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { CellReading } from './cell.service';
import { Segment } from 'src/utils/bms.utils';
import { CELL_COMPARE_DATA, CellViewComponent } from 'src/pages/bms-debug-page/components/cell-view/cell-view.component';

export enum HeatMapView {
  Voltage = 'C Volts',
  SVolts = 'S Volts',
  Temperature = 'Temperature',
  Balancing = 'Balancing',
  CvsFailure = 'CvS Failure',
  OpenWire = 'Open Wire'
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
  private injector = inject(Injector);

  private currentViewMap: Map<Segment, BehaviorSubject<HeatMapView>> = new Map();

  /** Global default view — drives the "Set ALL Maps" selector and initial per-segment defaults */
  readonly globalView$ = new BehaviorSubject<HeatMapView>(HeatMapView.Voltage);

  /** Multi-cell selection state, keyed by CellReading identity */
  private selectedCells = new Map<CellReading, SelectedCellInfo>();
  /** The open Cell Comparison panel, if any. */
  overlayRef: OverlayRef | null = null;

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
    // Open the panel if not already open, and the caller requested it.
    if (this.selectedCells.size > 0 && !this.overlayRef) {
      // A plain CDK overlay rather than MatDialog: the panel is non-modal (cells behind it stay
      // clickable), and MatDialog would aria-hide the rest of the app while it is open.
      const overlayRef = createOverlayRef(this.injector, {
        positionStrategy: createGlobalPositionStrategy(this.injector).top('96px').right('24px'),
        hasBackdrop: false,
        panelClass: 'cell-compare-pane',
        disposeOnNavigation: true
      });
      const injector = Injector.create({
        parent: this.injector,
        providers: [
          { provide: CELL_COMPARE_DATA, useValue: { cells: this.selectedCells, close: () => overlayRef.dispose() } }
        ]
      });
      overlayRef.attach(new ComponentPortal(CellViewComponent, null, injector));
      overlayRef
        .keydownEvents()
        .pipe(filter((event) => event.key === 'Escape' && !hasModifierKey(event)))
        .subscribe(() => overlayRef.dispose());
      overlayRef.detachments().subscribe(() => {
        this.clearSelection();
        this.overlayRef = null;
      });
      this.overlayRef = overlayRef;
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
    // close the panel if no cells remain selected and the caller requested it.
    if (this.selectedCells.size === 0 && this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
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
