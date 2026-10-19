import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { BMS_CRITICAL_FAULTS, CHARGER_FAULTS } from 'src/utils/fault.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import VStackComponent from 'src/components/vstack/vstack.component';

enum FaultType {
  BMS = 'BMS',
  Charger = 'Charger'
}

@Component({
  selector: 'fault-display',
  templateUrl: './fault-display.component.html',
  styleUrls: ['./fault-display.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent, VStackComponent]
})
export default class FaultDisplayComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  faults: { type: string; name: string; time: string }[] = [];
  faultsShifted: boolean = false;
  resetButton = {
    onClick: () => {
      this.faults = [];
    },
    icon: 'restart_alt'
  };

  ngOnInit() {
    CHARGER_FAULTS.forEach(({ name, topic }) => this.faultSubcribe(name, topic, FaultType.Charger));
    BMS_CRITICAL_FAULTS.forEach(({ name, topic }) => this.faultSubcribe(name, topic, FaultType.BMS));
  }

  /**
   * Subscribes to the the {@link faultIdentifier} as key in {@link this.storage} given and
   * checks each message to see if it is a fault using {@link addFault}.
   *
   * @param displayName the name of the fault to be displayed.
   * @param faultIdentifier the identifier for the fault.
   * @param faultType the type of the fault.
   */
  private faultSubcribe(displayName: string, faultIdentifier: string, faultType: FaultType) {
    let lastFaultValue = 0;
    this.storage
      .get(faultIdentifier)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const newValue = parseInt(value.values[0]);
        this.addFault(newValue, displayName, faultType, lastFaultValue);
        lastFaultValue = newValue;
      });
  }

  /**
   * Adds the fault name, with the current time to the faults array, if the faultValue is NOT 0 and
   * the last message was a positive for the fault (lastFaultValue is 0).
   * Shifts through the fault array to keep only the most recent 50 faults.
   *
   * @param faultValue an string with an integer value.
   * @param faultName the name of the fault, to be displayed.
   */
  private addFault(faultValue: number, faultName: string, faultType: FaultType, lastFaultValue: number) {
    if (faultValue !== 0 && lastFaultValue === 0) {
      if (this.faults.length >= 50) {
        this.faults.pop();
      }
      this.faultsShifted = !this.faultsShifted;

      this.faults.unshift({
        type: faultType,
        name: faultName,
        time: new Date().toLocaleTimeString()
      });
    }
  }
}
