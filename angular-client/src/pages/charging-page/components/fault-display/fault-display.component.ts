import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
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
export default class FaultDisplayComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];
  faults: { type: string; name: string; time: string }[] = [];
  faultsShifted: boolean = false;
  resetButton = {
    onClick: () => {
      this.faults = [];
    },
    icon: 'restart_alt'
  };

  ngOnInit() {
    const chargerFaultAndDisplayNames = [
      {
        displayName: 'Comm Timeout',
        faultIdentifier: topics.commTimeoutFault()
      },
      {
        displayName: 'Hardware Failure',
        faultIdentifier: topics.hardwareFailureFault()
      },
      {
        displayName: 'Over Temp',
        faultIdentifier: topics.overTempFault()
      },
      {
        displayName: 'Over Voltage Fault',
        faultIdentifier: topics.overVoltageFault()
      },
      {
        displayName: 'Wrong Battery Connect',
        faultIdentifier: topics.wrongBatConnectFault()
      }
    ];
    chargerFaultAndDisplayNames.forEach((faultAndDisplayName) => {
      this.faultSubcribe(faultAndDisplayName.displayName, faultAndDisplayName.faultIdentifier, FaultType.Charger);
    });

    const bmsFaultAndDisplayNames = [
      {
        displayName: 'Open Wire',
        faultIdentifier: topics.openWire()
      },
      {
        displayName: 'Charger Limit Enforcement',
        faultIdentifier: topics.chargerLimitEnforcementFault()
      },
      {
        displayName: 'Charger Can Fault',
        faultIdentifier: topics.chargerCanFault()
      },
      {
        displayName: 'Battery Thermistor',
        faultIdentifier: topics.batteryThermistor()
      },
      {
        displayName: 'Charger Safety Relay',
        faultIdentifier: topics.chargerSafetyRelay()
      },
      {
        displayName: 'Discharge Limit Enforcement',
        faultIdentifier: topics.dischargeLimitEnforcementFault()
      },
      {
        displayName: 'External Can Fault',
        faultIdentifier: topics.externalCanFault()
      },
      {
        displayName: 'Weak Pack Fault',
        faultIdentifier: topics.weakPackFault()
      },
      {
        displayName: 'Low Cell Voltage',
        faultIdentifier: topics.lowCellVoltage()
      },
      {
        displayName: 'Charge Reading Mismatch',
        faultIdentifier: topics.chargeReadingMismatch()
      },
      {
        displayName: 'Current Sensor Fault',
        faultIdentifier: topics.currentSensorFault()
      },
      {
        displayName: 'Internal Cell Comm Fault',
        faultIdentifier: topics.internalCellCommFault()
      },
      {
        displayName: 'Internal Software Fault',
        faultIdentifier: topics.internalSoftwareFault()
      },
      {
        displayName: 'Pack Overheat',
        faultIdentifier: topics.packOverheat()
      },
      {
        displayName: 'Cell Undervoltage',
        faultIdentifier: topics.cellUndervoltage()
      },
      {
        displayName: 'Cell Overvoltage',
        faultIdentifier: topics.cellOvervoltage()
      },
      {
        displayName: 'Cells Not Balancing',
        faultIdentifier: topics.cellsNotBalancing()
      }
    ];

    bmsFaultAndDisplayNames.forEach((faultAndDisplayName) => {
      this.faultSubcribe(faultAndDisplayName.displayName, faultAndDisplayName.faultIdentifier, FaultType.BMS);
    });
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
    this.subscriptions.push(
      this.storage.get(faultIdentifier).subscribe((value) => {
        const newValue = parseInt(value.values[0]);
        this.addFault(newValue, displayName, faultType, lastFaultValue);
        lastFaultValue = newValue;
      })
    );
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

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
