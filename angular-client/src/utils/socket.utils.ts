import { Subject } from 'rxjs';

/**
 * The storage system for the data received from the server
 */
export type StorageMap = Map<string, Subject<DataValue>>;

/**
 * The value of a data point
 */
export type DataValue = {
  values: string[];
  time: string;
  unit: string;
};

/**
 * The format of a message sent from the server
 */
export type ServerData = {
  runId: number;
  name: string;
  unit: string;
  values: string[];
  timestamp: number;
};
