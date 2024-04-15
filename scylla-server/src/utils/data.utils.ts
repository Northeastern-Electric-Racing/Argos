export enum DataType {
  PackTemp = 'Pack Temp',
  MotorTemp = 'Motor Temp',
  PackSOC = 'Pack SOC',
  XYZAccel = 'XYZAcceleration',
  Points = 'Points',
  Driver = 'Driver',
  SteeringAngle = 'Steering Angle',
  System = 'System',
  Location = 'Location',
  Voltage = 'Voltage',
  Radius = 'Radius',
  CPUUsage = 'OnBoard-CpuUsage',
  CPUTemp = 'OnBoard-CpuTemp',
  RAMUsage = 'OnBoard-MemAvailable',
  WIFIRSSI = 'HaLow-RSSI',
  MCS = 'HaLow-ApMCS',
  Acceleration = 'Acceleration',
  CCL = 'Charge Current Limit',
  DCL = 'Discharge Current Limit',
  Brake_Pressure = 'Brake Pressure',
  Torque = 'Torque',
  SPEED = 'Speed'
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
