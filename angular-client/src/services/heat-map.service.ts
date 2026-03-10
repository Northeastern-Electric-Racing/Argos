import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CellReading } from './cell.service';
import { Segment } from 'src/utils/bms.utils';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

export enum HeatMapView {
  Voltage = 'Voltage',
  Temperature = 'Temperature',
  Balancing = 'Balancing'
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
  private currentViewMap: Map<Segment, BehaviorSubject<HeatMapView>> = new Map();

  /** Global default view — drives the "Set ALL Maps" selector and initial per-segment defaults */
  readonly globalView$ = new BehaviorSubject<HeatMapView>(HeatMapView.Voltage);

  /** Multi-cell selection state, keyed by CellReading identity */
  selectedCells = new Map<CellReading, SelectedCellInfo>();
  dialogRef: DynamicDialogRef | null = null;

  /**
   * Toggle a group of readings as a unit. Uses the first reading's
   * selection state as the lead — if it is already selected every
   * reading in the list is deselected, otherwise all are selected.
   */
  toggleCells(readings: CellReading[], cellLabel: string, segment: Segment): void {
    if (this.isCellSelected(readings[0])) {
      this.deselectCells(readings);
    } else {
      this.selectCells(readings, segment);
    }
  }

  /** Select readings (no-op for already-selected readings). */
  selectCells(readings: CellReading[], segment: Segment): void {
    for (const reading of readings) {
      this.selectedCells.set(reading, { reading, cellNum: reading.cellNumber, segment });
    }
  }

  /** Deselect readings (no-op for already-deselected readings). */
  deselectCells(readings: CellReading[]): void {
    for (const reading of readings) {
      this.selectedCells.delete(reading);
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
