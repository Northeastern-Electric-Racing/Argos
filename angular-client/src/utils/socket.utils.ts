import { Subject } from 'rxjs';

/**
 * The storage system for the data received from the server
 */
export type StorageMap = Map<string, Subject<DataValue>>;

/**
 * The storage system for timer data received from the server
 */
export type TimerStorageMap = Map<string, Subject<TimerData>>;

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

/**
 * The format of a timer data message sent from the server
 */
export type TimerData = {
  topic: string;
  last_change: number;
  last_value: number;
  total_time_per_value_map: Record<string, { start_time: number; end_time: number }[]>;
};
