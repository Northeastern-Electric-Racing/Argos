import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CellReading } from './cell.service';
export enum HeatMapView {
  Voltage = 'Voltage',
  Temperature = 'Temperature'
}

@Injectable({
  providedIn: 'root'
})
export class HeatMapService {
  private selectedCell: BehaviorSubject<CellReading | undefined> = new BehaviorSubject<CellReading | undefined>(undefined);
  private currentView = new BehaviorSubject<HeatMapView>(HeatMapView.Temperature);

  setSelectedCell = (fault: CellReading) => {
    this.selectedCell.next(fault);
    console.log('Selected cell:', fault);
  };

  getSelectedCell = () => {
    return this.selectedCell.asObservable();
  };

  setCurrentView = (view: HeatMapView) => {
    console.log('Current view:', view);
    this.currentView.next(view);
  };

  getCurrentView = () => {
    return this.currentView;
  };
}
