/**
 * Frontend type of a Node
 */
export type Node = {
  name: string;
};

/**
 * Frontend type of a DataType
 */
export type DataType = {
  name: string;
  unit: string;
};

/**
 * Frontend type of a Run
 */
export type Run = {
  id: number;
  locationName: string;
  driverName: string;
  systemName: string;
  time: number;
};
