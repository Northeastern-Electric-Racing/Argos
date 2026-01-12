import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
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
        faultIdentifier: DataTypeEnum.COMM_TIMEOUT_FAULT
      },
      {
        displayName: 'Hardware Failure',
        faultIdentifier: DataTypeEnum.HARDWARE_FAILURE_FAULT
      },
      {
        displayName: 'Over Temp',
        faultIdentifier: DataTypeEnum.OVER_TEMP_FAULT
      },
      {
        displayName: 'Over Voltage Fault',
        faultIdentifier: DataTypeEnum.OVER_VOLTAGE_FAULT
      },
      {
        displayName: 'Wrong Battery Connect',
        faultIdentifier: DataTypeEnum.WRONG_BAT_CONNECT_FAULT
      }
    ];
    // Subscribe to each charger fault, with a display name (to display when the fault is triggered)
    chargerFaultAndDisplayNames.forEach((faultAndDisplayName) => {
      this.faultSubcribe(faultAndDisplayName.displayName, faultAndDisplayName.faultIdentifier, FaultType.Charger);
    });

    const bmsFaultAndDisplayNames = [
      {
        displayName: 'Open Wire',
        faultIdentifier: DataTypeEnum.OPEN_WIRE
      },
      {
        displayName: 'Charger Limit Enforcement',
        faultIdentifier: DataTypeEnum.CHARGER_LIMIT_ENFORCEMENT_FAULT
      },
      {
        displayName: 'Charger Can Fault',
        faultIdentifier: DataTypeEnum.CHARGER_CAN_FAULT
      },
      {
        displayName: 'Battery Thermistor',
        faultIdentifier: DataTypeEnum.BATTERY_THERMISTOR
      },
      {
        displayName: 'Charger Safety Relay',
        faultIdentifier: DataTypeEnum.CHARGER_SAFETY_RELAY
      },
      {
        displayName: 'Discharge Limit Enforcement',
        faultIdentifier: DataTypeEnum.DISCHARGE_LIMIT_ENFORCEMENT_FAULT
      },
      {
        displayName: 'External Can Fault',
        faultIdentifier: DataTypeEnum.EXTERNAL_CAN_FAULT
      },
      {
        displayName: 'Weak Pack Fault',
        faultIdentifier: DataTypeEnum.WEAK_PACK_FAULT
      },
      {
        displayName: 'Low Cell Voltage',
        faultIdentifier: DataTypeEnum.LOW_CELL_VOLTAGE
      },
      {
        displayName: 'Charge Reading Mismatch',
        faultIdentifier: DataTypeEnum.CHARGE_READING_MISMATCH
      },
      {
        displayName: 'Current Sensor Fault',
        faultIdentifier: DataTypeEnum.CURRENT_SENSOR_FAULT
      },
      {
        displayName: 'Internal Cell Comm Fault',
        faultIdentifier: DataTypeEnum.INTERNAL_CELL_COMM_FAULT
      },
      {
        displayName: 'Internal Software Fault',
        faultIdentifier: DataTypeEnum.INTERNAL_SOFTWARE_FAULT
      },
      {
        displayName: 'Pack Overheat',
        faultIdentifier: DataTypeEnum.PACK_OVERHEAT
      },
      {
        displayName: 'Cell Undervoltage',
        faultIdentifier: DataTypeEnum.CELL_UNDERVOLTAGE
      },
      {
        displayName: 'Cell Overvoltage',
        faultIdentifier: DataTypeEnum.CELL_OVERVOLTAGE
      },
      {
        displayName: 'Cells Not Balancing',
        faultIdentifier: DataTypeEnum.CELLS_NOT_BALANCING
      }
    ];

    // Subscribe to each BMS fault, with a display name (to display when the fault is triggered)
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
  private faultSubcribe(displayName: string, faultIdentifier: DataTypeEnum, faultType: FaultType) {
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
    // only add fault if it is positve for a fault and the last value for this fault was not a fault
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
