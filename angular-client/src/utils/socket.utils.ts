import { BehaviorSubject } from 'rxjs';

/**
 * The storage system for the data received from the server
 */
export type StorageMap = Map<string, BehaviorSubject<DataValue>>;

/**
 * The value of a data point
 */
export type DataValue = {
  values: string[];
  time: number;
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
