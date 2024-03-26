export enum DataType {
  PackTemp = 'Pack Temp',
  MotorTemp = 'Motor Temp',
  PackSOC = 'Pack SOC',
  Accel = 'Acceleration',
  Points = 'Points',
  SteeringAngle = 'Steering Angle'
}

//the format of mock data on mock proxy client
export type MockData = {
  name: DataType;
  unit: string;
  vals: number[];
  min: number;
  max: number;
};
