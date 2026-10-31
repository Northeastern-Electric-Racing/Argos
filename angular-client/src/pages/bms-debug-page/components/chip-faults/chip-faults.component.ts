import { Component, effect, inject, input, OnInit, DestroyRef, ChangeDetectionStrategy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { appRoutes } from 'src/app/app-routes';
import { FaultService } from 'src/services/fault.service';
import Storage from 'src/services/storage.service';
import { Chip, chipToString } from 'src/utils/bms.utils';
import { allChipFaults, topics } from 'src/utils/topic.utils';
import { FaultData } from 'src/utils/types.utils';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import { NzTableModule } from 'ng-zorro-antd/table';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'chip-faults',
  templateUrl: './chip-faults.component.html',
  styleUrl: './chip-faults.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InfoBackgroundComponent, NzTableModule, DatePipe]
})
export class ChipFaultsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  /** Emits when the inputs change, ending the subscriptions made for the previous ones. */
  private dataChange$ = new Subject<void>();
  private faultService = inject(FaultService);
  private storage = inject(Storage);
  chip = input.required<Chip>();
  title!: string;
  segment = input.required<number>();
  /** Newest first, at most 50. A new array each time, since nz-table only reads [nzData] when the reference changes. */
  chipFaults = signal<FaultData[]>([]);
  selectedFault: FaultData | undefined = undefined;
  private router = inject(Router);
  chipFaultPipe = inject(ChipFaultPipe);

  constructor() {
    effect(() => {
      this.dataChange$.next();
      this.resetFaults();
      this.subscribeToData(this.segment());
    });
  }

  resetFaults() {
    this.chipFaults.set([]);
  }

  subscribeToData(segment: number, chip: Chip = this.chip()) {
    allChipFaults.forEach((faultName) => {
      this.storage
        .get(topics.chipFault(segment, chip, faultName))
        .pipe(takeUntil(this.dataChange$), takeUntilDestroyed(this.destroyRef))
        .subscribe((data) => {
          if (parseInt(data.values[0]) === 0) return;
          const fault = this.chipFaultPipe.transform(data, chip, segment, faultName);
          if (!fault) return;
          this.chipFaults.update((faults) => [fault, ...faults].slice(0, 50));
        });
    });
  }

  ngOnInit(): void {
    // Simply formats: Chip (Alpha/Beta) Faults
    this.title = `Chip ${chipToString(this.chip())} Faults`;
  }

  onRowSelect = (fault: FaultData) => {
    this.selectedFault = fault;
    if (this.selectedFault) {
      this.faultService.selectFault(this.selectedFault);
      this.navigateTo(appRoutes.faultsGraphRoute());
    }
  };

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
