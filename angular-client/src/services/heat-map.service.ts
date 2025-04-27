import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CellReading } from './cell.service';
import { Segment } from 'src/utils/bms.utils';

export enum HeatMapView {
  Voltage = 'Voltage',
  Temperature = 'Temperature'
}

@Injectable({
  providedIn: 'root'
})
export class HeatMapService {
  private selectedCellMap: Map<Segment, BehaviorSubject<CellReading | undefined>> = new Map();
  private currentViewMap: Map<Segment, BehaviorSubject<HeatMapView>> = new Map();

  setSelectedCell = (cell: CellReading) => {
    if (!this.selectedCellMap.get(cell.segment)) {
      this.selectedCellMap.set(cell.segment, new BehaviorSubject<CellReading | undefined>(cell));
    }
    this.selectedCellMap.get(cell.segment)?.next(cell);
  };

  getSelectedCell = (segment: Segment) => {
    if (!this.selectedCellMap.get(segment)) {
      this.selectedCellMap.set(segment, new BehaviorSubject<CellReading | undefined>(undefined));
    }
    return this.selectedCellMap.get(segment)!;
  };

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
    return this.currentViewMap.get(segment)?.value ?? HeatMapView.Voltage;
  };
}
