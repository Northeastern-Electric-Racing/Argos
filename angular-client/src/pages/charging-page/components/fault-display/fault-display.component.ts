import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

enum BMS_FAULTS_TYPES {
  CELLS_NOT_BALANCING = 1,
  CELL_VOLTAGE_TOO_LOW = 2,
  CELL_VOLTAGE_TOO_HIGH = 4,
  PACK_TOO_HOT = 8,
  OPEN_WIRING_FAULT = 16,
  INTERNAL_SOFTWARE_FAULT = 32,
  INTERNAL_THERMAL_ERROR = 64,
  INTERNAL_CELL_COMM_FAULT = 128,
  CURRENT_SENSOR_FAULT = 256,
  CHARGE_READING_MISMATCH = 512,
  LOW_CELL_VOLTAGE = 1024,
  WEAK_PACK_FAULT = 2048,
  EXTERNAL_CAN_FAULT = 4096,
  DISCHARGE_LIMIT_ENFORCEMENT_FAULT = 8192,
  CHARGER_SAFETY_RELAY = 16384,
  BATTERY_THERMISTOR = 32768,
  CHARGER_CAN_FAULT = 65536,
  CHARGER_LIMIT_ENFORCEMENT_FAULT = 131072
}

enum FaultType {
  BMS = 'BMS',
  Charger = 'Charger'
}

@Component({
  selector: 'fault-display',
  templateUrl: './fault-display.component.html',
  styleUrls: ['./fault-display.component.css']
})
export default class FaultDisplay {
  faults: { type: string; name: string; time: string }[] = [];
  faultsShifted: boolean = false;
  resetButton = {
    onClick: () => {
      this.faults = [];
    },
    icon: 'restart_alt'
  };
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.COMM_TIMEOUT_FAULT).subscribe((value) => {
      this.addFault(value.values[0], 'Comm Timeout', FaultType.Charger);
    });

    this.storage.get(IdentifierDataType.HARDWARE_FAILURE_FAULT).subscribe((value) => {
      this.addFault(value.values[0], 'Hardware Failure', FaultType.Charger);
    });

    this.storage.get(IdentifierDataType.OVER_TEMP_FAULT).subscribe((value) => {
      this.addFault(value.values[0], 'Over Temp', FaultType.Charger);
    });

    this.storage.get(IdentifierDataType.VOLTAGE_WRONG_FAULT).subscribe((value) => {
      this.addFault(value.values[0], 'Voltage Wrong', FaultType.Charger);
    });

    this.storage.get(IdentifierDataType.WRONG_BAT_CONNECT_FAULT).subscribe((value) => {
      this.addFault(value.values[0], 'Wrong Battery Connect', FaultType.Charger);
    });

    /**
     * This is based on the shepard enum for faults:
     * https://github.com/Northeastern-Electric-Racing/ShepherdBMS-2/blob/6eb3f863ed131a15bdf98665532cb7807bbd2920/Core/Inc/datastructs.h#L39
     */
    this.storage.get(IdentifierDataType.BMS_FAULTS).subscribe((value) => {
      this.addFault(value.values[0], 'MASSIVE L, Should not be a fault hahaha', FaultType.BMS);
    });
  }

  /**
   * Adds the fault name, with the current time to the faults array, if the faultValue is NOT 0.
   * Shifts through the fault array to keep only the most recent 50 faults.
   *
   * @param faultValue an string with an integer value.
   * @param faultName the name of the fault, to be displayed.
   */
  addFault(faultValue: string, faultName: string, faultType: FaultType) {
    if (parseInt(faultValue) !== 0) {
      if (faultType === FaultType.BMS) {
        faultName = this.getBMSFaultName(parseInt(faultValue));
      }
      // current implementation doesn't need a specified case for charger faults
      // (they have indiv binary id's)
      if (this.faults.length >= 50) {
        this.faults.pop();
      }
      this.faultsShifted = !this.faultsShifted;

      this.faults.unshift({ type: faultType, name: faultName, time: new Date().toLocaleTimeString() });
    }
  }

  getBMSFaultName(faultValue: number): string {
    let faultName = '';
    switch (faultValue) {
      case BMS_FAULTS_TYPES.CELLS_NOT_BALANCING:
        faultName = 'Cells Not Balancing';
        break;
      case BMS_FAULTS_TYPES.CELL_VOLTAGE_TOO_LOW:
        faultName = 'Cell Voltage too Low';
        break;
      case BMS_FAULTS_TYPES.CELL_VOLTAGE_TOO_HIGH:
        faultName = 'Cell Voltage too High';
        break;
      case BMS_FAULTS_TYPES.PACK_TOO_HOT:
        faultName = ' Pack too Hot';
        break;
      case BMS_FAULTS_TYPES.OPEN_WIRING_FAULT:
        faultName = 'Open Wiring Fault';
        break;
      case BMS_FAULTS_TYPES.INTERNAL_SOFTWARE_FAULT:
        faultName = 'Internal Software Fault';
        break;
      case BMS_FAULTS_TYPES.INTERNAL_THERMAL_ERROR:
        faultName = 'Internal Thermal Error';
        break;
      case BMS_FAULTS_TYPES.INTERNAL_CELL_COMM_FAULT:
        faultName = 'Internal Cell Comm Fault';
        break;
      case BMS_FAULTS_TYPES.CURRENT_SENSOR_FAULT:
        faultName = 'Current Sensor Fault';
        break;
      case BMS_FAULTS_TYPES.CHARGE_READING_MISMATCH:
        faultName = 'Charge Reading Mismatch';
        break;
      case BMS_FAULTS_TYPES.LOW_CELL_VOLTAGE:
        faultName = 'Low Cell Voltage';
        break;
      case BMS_FAULTS_TYPES.WEAK_PACK_FAULT:
        faultName = 'Weak Pack Fault';
        break;
      case BMS_FAULTS_TYPES.EXTERNAL_CAN_FAULT:
        faultName = 'External Can Fault';
        break;
      case BMS_FAULTS_TYPES.DISCHARGE_LIMIT_ENFORCEMENT_FAULT:
        faultName = 'Discharge Limit Enforcement Fault';
        break;
      case BMS_FAULTS_TYPES.CHARGER_SAFETY_RELAY:
        faultName = 'Charger Safety Relay';
        break;
      case BMS_FAULTS_TYPES.BATTERY_THERMISTOR:
        faultName = 'Battery Thermistor';
        break;
      case BMS_FAULTS_TYPES.CHARGER_CAN_FAULT:
        faultName = 'Charger Can Fault';
        break;
      case BMS_FAULTS_TYPES.CHARGER_LIMIT_ENFORCEMENT_FAULT:
        faultName = 'Charger Limit Enforcement Fault';
        break;
    }
    return faultName;
  }
}
