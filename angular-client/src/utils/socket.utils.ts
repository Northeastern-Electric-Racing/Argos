/**
 * The storage system for the data received from the server
 */
export type StorageMap = Map<string, DataValue[]>;

/**
 * The value of a data point
 */
export type DataValue = {
  value: string | number;
  timestamp: number;
};

/**
 * The format of a message sent from the server
 */
export type ServerData = {
  runId: string;
  name: string;
  unit: string;
  value: number;
  timestamp: number;
};
