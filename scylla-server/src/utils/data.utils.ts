export enum DataType {
  PackTemp = 'Pack Temp',
  MotorTemp = 'Motor Temp',
  PackSOC = 'Pack SOC',
  Accel = 'Acceleration',
  Points = 'Points',
  Driver = 'Driver'
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
