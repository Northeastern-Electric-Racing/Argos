export enum DataType {
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
  VOLTAGE = 'Status-Voltage_Average',
  AMPS = 'AMPS',
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
  RADIUS = 'Radius',
  STATUS = 'Status',
  FAULTS = 'Faults'
}

//the format of mock data on mock proxy client for numerical values
export type MockData = {
  name: DataType;
  unit: string;
  vals: number[];
  min: number;
  max: number;
};

//the format for mock data on mock proxy client for string values
export type MockStringData = {
  name: DataType;
  units: string;
  vals: string[];
};
