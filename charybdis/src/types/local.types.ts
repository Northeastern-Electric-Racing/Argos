/**
 * Representation of run in our local database.
 */
export interface LocalRun {
  runId: number;
  driverName: string;
  locationName: string;
  notes: string;
  time: Date;
}

/**
 * Representation of data in our local database.
 */
export interface LocalData {
  values: number[];
  time: bigint;
  runId: number;
  dataTypeName: string;
}

/**
 * Representation of a data type in our local database.
 */
export interface LocalDataType {
  name: string;
  unit: string;
  nodeName: string;
}
