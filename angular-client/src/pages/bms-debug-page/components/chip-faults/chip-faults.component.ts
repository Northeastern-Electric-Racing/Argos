import { Component, effect, inject, input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { appRoutes } from 'src/app/app-routing.module';
import { FaultService } from 'src/services/fault.service';
import Storage from 'src/services/storage.service';
import { Chip, chipToString } from 'src/utils/bms.utils';
import { allChipFaults, topics } from 'src/utils/topic.utils';
import { FaultData } from 'src/utils/types.utils';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';

@Component({
  selector: 'chip-faults',
  templateUrl: './chip-faults.component.html',
  styleUrl: './chip-faults.component.css'
})
export class ChipFaultsComponent implements OnInit {
  private faultService = inject(FaultService);
  private storage = inject(Storage);
  chip = input.required<Chip>();
  title!: string;
  segment = input.required<number>();
  subscribtions: Subscription[] = [];
  chipFaults: FaultData[] = [];
  selectedFault: FaultData | undefined = undefined;
  private router = inject(Router);
  chipFaultPipe = inject(ChipFaultPipe);

  constructor() {
    effect(() => {
      this.subscribtions.forEach((sub) => sub.unsubscribe());
      this.resetFaults();
      this.subscribeToData(this.segment());
    });
  }

  resetFaults() {
    this.subscribtions.forEach((sub) => sub.unsubscribe());
    this.chipFaults = [];
  }

  subscribeToData(segment: number, chip: Chip = this.chip()) {
    allChipFaults.forEach((faultName) => {
      this.subscribtions.push(
        this.storage.get(topics.chipFault(segment, chip, faultName)).subscribe((data) => {
          if (parseInt(data.values[0]) === 0) return;
          const fault = this.chipFaultPipe.transform(data, chip, segment, faultName);
          if (!fault) return;
          if (this.chipFaults.length >= 50) {
            this.chipFaults.pop();
          }
          this.chipFaults.unshift(fault);
        })
      );
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
