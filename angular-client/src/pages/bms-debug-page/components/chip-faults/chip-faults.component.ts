import { Component, effect, inject, input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { appRoutes } from 'src/app/app-routing.module';
import { FaultService } from 'src/services/fault.service';
import Storage from 'src/services/storage.service';
import { Chip } from 'src/utils/bms.utils';
import { allChipFaults, dataTypes } from 'src/utils/topic.utils';
import { FaultData } from 'src/utils/types.utils';

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
        this.storage.get(dataTypes.chipFault(segment, chip, faultName)).subscribe((data) => {
          if (parseInt(data.values[0]) === 0) return;
          const chipFault: FaultData = {
            node: 'BMS',
            name: 'PerCell/' + (chip === Chip.Alpha ? 'Alpha' : 'Beta') + '/' + segment + '/' + faultName,
            occurredAt: new Date(parseInt(data.time)),
            lastSeen: new Date(parseInt(data.time)),
            expired: false
          };
          this.chipFaults.push(chipFault);
        })
      );
    });
  }

  ngOnInit(): void {
    // Simply formats: Chip (Alpha/Beta) Faults
    this.title = `Chip ${Chip[this.chip()]} Faults`;
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
