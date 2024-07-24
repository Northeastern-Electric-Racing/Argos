export enum IdentifierDataType {
  DRIVER = 'Driver',
  LOCATION = 'location',
  SYSTEM = 'system',
  PACK_TEMP = 'Status-Temp_Average',
  MOTOR_TEMP = 'Temps-Motor_Temperature',
  MOTOR_USAGE = 'Motor Usage',
  COOL_USAGE = 'Cooling Usage',
  STATE_OF_CHARGE = 'Pack-SOC',
  POINTS = 'GPS-Location',
  LATENCY = 'Latency',
  STEERING_ANGLE = 'Steering Angle',
  CURRENT = 'Charging_Current',
  COMM_TIMEOUT_FAULT = 'Box-F_CommTimeout',
  HARDWARE_FAILURE_FAULT = 'Box-F_HardwareFailure',
  OVER_TEMP_FAULT = 'Box-F_OverTemp',
  VOLTAGE_WRONG_FAULT = 'Box-F_OverVoltage',
  WRONG_BAT_CONNECT_FAULT = 'Box-F_WrongBatConnect',
  VIEWERS = 'Viewers',
  SPEED = 'State-Speed',
  TORQUE = 'Torque',
  BRAKE_PRESSURE = 'Brake Pressure',
  CPUUsage = 'OnBoard-CpuUsage',
  CPUTemp = 'OnBoard-CpuTemp',
  RAMUsage = 'OnBoard-MemAvailable',
  WIFIRSSI = 'HaLow-RSSI',
  MCS = 'HaLow-ApMCS',
  ACCELERATION = 'Acceleration',
  CHARGE_CURRENT_LIMIT = 'Pack-CCL',
  DISCHARGE_CURRENT_LIMIT = 'Pack-DCL',
  XYZAccel = 'XYZAcceleration',
  STATUS = 'Status-Balancing',
  BMS_MODE = 'Status-State',
  VOLTS_HIGH = 'Cells-Volts_High_Value',
  VOLTS_LOW = 'Cells-Volts_Low_Value',
  CHARGING = 'Charging-Control',
  PACK_VOLTAGE = 'Pack-Voltage',
  CELL_TEMP_HIGH = 'Cells-Temp_High_Value',
  CELL_TEMP_AVG = 'Cells-Temp_Avg_Value'
}
