import { Component, effect, inject, input, OnInit, DestroyRef } from '@angular/core';
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
import { TableModule } from 'primeng/table';
import { PrimeTemplate } from 'primeng/api';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'chip-faults',
  templateUrl: './chip-faults.component.html',
  styleUrl: './chip-faults.component.css',
  standalone: true,
  imports: [InfoBackgroundComponent, TableModule, PrimeTemplate, DatePipe]
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
  chipFaults: FaultData[] = [];
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
    this.chipFaults = [];
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
          if (this.chipFaults.length >= 50) {
            this.chipFaults.pop();
          }
          this.chipFaults.unshift(fault);
        });
    });
  }

  ngOnInit(): void {
    // Simply formats: Chip (Alpha/Beta) Faults
    this.title = `Chip ${chipToString(this.chip())} Faults`;
  }

  onRowSelect = () => {
    if (this.selectedFault) {
      this.faultService.selectFault(this.selectedFault);
      this.navigateTo(appRoutes.faultsGraphRoute());
    }
  };

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
