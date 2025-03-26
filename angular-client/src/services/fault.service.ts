import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { FaultData } from 'src/utils/types.utils';

@Injectable({
  providedIn: 'root'
})
export class FaultService {
  private faultData: Subject<FaultData[]> = new Subject();
  private selectedFault: BehaviorSubject<FaultData | undefined> = new BehaviorSubject<FaultData | undefined>(undefined);

  addFault = (faultData: FaultData[]) => {
    this.faultData.next(faultData.sort((a, b) => a.name.localeCompare(b.name)));
  };

  getFaults = () => {
    return this.faultData;
  };

  selectFault = (fault: FaultData) => {
    this.selectedFault.next(fault);
  };

  getSelectedFault = () => {
    return this.selectedFault;
  };
}
