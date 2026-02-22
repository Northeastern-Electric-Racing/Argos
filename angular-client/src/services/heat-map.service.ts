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
  cellNum: string;
  segment: Segment;
}

@Injectable({
  providedIn: 'root'
})
export class HeatMapService {
  private currentViewMap: Map<Segment, BehaviorSubject<HeatMapView>> = new Map();

  /** Multi-cell selection state */
  selectedCells: SelectedCellInfo[] = [];
  dialogRef: DynamicDialogRef | null = null;

  toggleCell(info: SelectedCellInfo): void {
    const idx = this.selectedCells.findIndex((s) => s.reading === info.reading);
    if (idx >= 0) {
      this.selectedCells.splice(idx, 1);
    } else {
      this.selectedCells.push(info);
    }
  }

  clearSelection(): void {
    this.selectedCells.length = 0;
  }

  isCellSelected(reading: CellReading): boolean {
    return this.selectedCells.some((s) => s.reading === reading);
  }

  setCurrentView = (segment: Segment, view: HeatMapView) => {
    if (!this.currentViewMap.get(segment)) {
      this.currentViewMap.set(segment, new BehaviorSubject(view));
    }
    this.currentViewMap.get(segment)?.next(view);
  };

  getCurrentView = (segment: Segment) => {
    if (!this.currentViewMap.get(segment)) {
      this.currentViewMap.set(segment, new BehaviorSubject<HeatMapView>(HeatMapView.Voltage));
    }
    return this.currentViewMap.get(segment);
  };

  setAllSegViews = (view: HeatMapView) => {
    this.currentViewMap.forEach((subject) => {
      subject.next(view);
    });
  };

  getAllSegViews = () => {
    return this.currentViewMap.values();
  };
}
