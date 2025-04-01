import { Component, inject, OnInit } from '@angular/core';
import { FaultService } from 'src/services/fault.service';
import { FaultData } from 'src/utils/types.utils';

@Component({
  selector: 'fault-display-info',
  templateUrl: './fault-display-info.component.html',
  styleUrl: './fault-display-info.component.css'
})
export class FaultDisplayInfoComponent implements OnInit {
  private faultService = inject(FaultService);
  selectedFault?: FaultData;

  ngOnInit(): void {
    const subscription = this.faultService.getSelectedFault();
    this.selectedFault = subscription.value;
    subscription.subscribe((fault) => (this.selectedFault = fault));
  }
}
