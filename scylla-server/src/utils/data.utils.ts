export enum DataType {
  PackTemp = 'Pack Temp',
  MotorTemp = 'Motor Temp',
  PackSOC = 'Pack SOC',
  AccelX = 'Accel X',
  AccelY = 'Accel Y',
  AccelZ = 'Accel Z'
}

//the format of mock data on mock proxy client
export type MockData = {
  name: DataType;
  unit: string;
  val: number[];
  min: number;
  max: number;
};
