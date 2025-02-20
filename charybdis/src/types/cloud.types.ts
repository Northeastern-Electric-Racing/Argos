/**
 * Represents a run in our cloud database.
 */
export interface CloudRun {
  id: string; // uuid
  runId: number; // based on the day of the run
  driverName: string;
  notes: string;
  time: Date;
}

/**
 * Representation of data in our cloud database.
 */
export interface CloudData {
  runId: string; // the run this data was recorded during
  dataTypeName: string; // the name of where the data came from (on the car)
  time: bigint; // the time the data was recorded
  values: number[]; // the values recorded
}

/**
 * Representation of a data type in the cloud database.
 */
export interface CloudDataType {
  name: string; // unique id
  unit: string; // e.g. "V (Volts), "A (Amps)", "C (Celsius)"
  nodeName: string;
}
