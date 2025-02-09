export enum DataTypeEnum {
  DRIVER = 'Driver',
  LOCATION = 'Location',
  VIEWERS = 'Viewers',

  // Special Latency info sent by Scylla
  LATENCY = 'Old_Latency',
  NEW_LATENCY = 'Latency',

  //Fake Data Points
  MOTOR_USAGE = 'Motor Usage',
  COOL_USAGE = 'Cooling Usage',
  STEERING_ANGLE = 'Steering Angle',
  TORQUE = 'Torque',
  BRAKE_PRESSURE = 'Brake Pressure',
  ACCELERATION = 'Acceleration',
  XYZAccel = 'XYZAcceleration',

  // MPU
  SPEED = 'MPU/State/Speed',

  // DTI
  MOTOR_TEMP = 'DTI/Temps/Motor_Temperature',

  // TPU
  CPUUsage = 'TPU/OnBoard/CpuUsage',
  CPUTemp = 'TPU/OnBoard/CpuTemp',
  RAMUsage = 'TPU/OnBoard/MemAvailable',
  WIFIRSSI = 'TPU/HaLow/RSSI',
  MCS = 'TPU/HaLow/ApMCS',
  POINTS = 'TPU/GPS/Location',

  // BMS
  PACK_TEMP = 'BMS/Status/Temp_Average',
  STATE_OF_CHARGE = 'BMS/Pack/SOC',
  CURRENT = 'BMS/Charging/Current',
  CHARGE_CURRENT_LIMIT = 'BMS/Pack/CCL',
  DISCHARGE_CURRENT_LIMIT = 'BMS/Pack/DCL',
  STATUS_BALANCING = 'BMS/Status/Balancing',
  BMS_MODE = 'BMS/Status/State',
  VOLTS_HIGH = 'BMS/Cells/Volts_High_Value',
  VOLTS_LOW = 'BMS/Cells/Volts_Low_Value',
  CHARGING = 'BMS/Charging/Control',
  PACK_VOLTAGE = 'BMS/Pack/Voltage',
  CELL_TEMP_HIGH = 'BMS/Cells/Temp_High_Value',
  CELL_TEMP_AVG = 'BMS/Cells/Temp_Avg_Value',

  // Charger Faults
  COMM_TIMEOUT_FAULT = 'Charger/Box/F_CommTimeout',
  HARDWARE_FAILURE_FAULT = 'Charger/Box/F_HardwareFailure',
  OVER_TEMP_FAULT = 'Charger/Box/F_OverTemp',
  OVER_VOLTAGE_FAULT = 'Charger/Box/F_OverVoltage',
  WRONG_BAT_CONNECT_FAULT = 'Charger/Box/F_WrongBatConnect',

  // BMS Faults
  OPEN_WIRE = 'BMS/Status/F/Open_Wire',
  CHARGER_LIMIT_ENFORCEMENT_FAULT = 'BMS/Status/F/CCL_Enforce',
  CHARGER_CAN_FAULT = 'BMS/Status/F/Charger_Can',
  BATTERY_THERMISTOR = 'BMS/Status/F/Battery_Therm',
  CHARGER_SAFETY_RELAY = 'BMS/Status/F/Charger_Safety',
  DISCHARGE_LIMIT_ENFORCEMENT_FAULT = 'BMS/Status/F/DCL_Enforce',
  EXTERNAL_CAN_FAULT = 'BMS/Status/F/External_Can',
  WEAK_PACK_FAULT = 'BMS/Status/F/Weak_Pack',
  LOW_CELL_VOLTAGE = 'BMS/Status/F/Low_Cell_Volts',
  CHARGE_READING_MISMATCH = 'BMS/Status/F/Charge_Reading',
  CURRENT_SENSOR_FAULT = 'BMS/Status/F/Current_Sense',
  INTERNAL_CELL_COMM_FAULT = 'BMS/Status/F/IC_Comm',
  INTERNAL_THERMAL_ERROR = 'BMS/Status/F/Thermal_Err',
  INTERNAL_SOFTWARE_FAULT = 'BMS/Status/F/Software',
  PACK_OVERHEAT = 'BMS/Status/F/Pack_Overheat',
  CELL_UNDERVOLTAGE = 'BMS/Status/F/Cell_Undervoltage',
  CELL_OVERVOLTAGE = 'BMS/Status/F/Cell_Overvoltage',
  CELLS_NOT_BALANCING = 'BMS/Status/F/Cells_Not_Balancing'
}
