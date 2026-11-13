import { ChangeDetectionStrategy, Component, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FaultService } from 'src/services/fault.service';
import { FaultData } from 'src/utils/types.utils';

import { DatePipe } from '@angular/common';

@Component({
  selector: 'fault-display-info',
  templateUrl: './fault-display-info.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe]
})
export class FaultDisplayInfoComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private faultService = inject(FaultService);
  selectedFault?: FaultData;

  ngOnInit(): void {
    const subscription = this.faultService.getSelectedFault();
    this.selectedFault = subscription.value;
    subscription.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fault) => (this.selectedFault = fault));
  }
}
