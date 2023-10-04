/**
 * The storage system for the data received from the server
 */
export type StorageMap = Map<string, DataValue[]>;

/**
 * The value of a data point
 */
type DataValue = {
  value: number;
  timestamp: number;
};

/**
 * The format of a message sent from the server
 */
export type ServerData = {
  name: string;
  unit: string;
  value: number;
  timestamp: number;
};