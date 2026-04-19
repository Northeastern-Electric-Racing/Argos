import { BehaviorSubject } from 'rxjs';

export interface Node {
  name: string;
  nodes: BehaviorSubject<Node[]>;
  dataType: DataType;
  topicName: string;
}

export interface NodeWithVisibilityToggle extends Node {
  subnodesVisible: boolean;
}

/**
 * Frontend type of a DataType
 */
export type DataType = {
  name: string;
  unit: string;
};

export interface CarCommandRow {
  dataType: DataType;
  label: string;
}

export interface CarCommand {
  title: string;
  rows: CarCommandRow[];
}

/**
 * Frontend type of Scylla Settings
 */
export type ScyllaSettings = {
  data_upload_disabled: boolean;
  batch_upsert_time: number;
  ratelimit_mode: number;
  static_ratelimit_time: number;
  socket_discard_percent: number;
};

/**
 * Frontend type of a Run
 */
export type Run = {
  id: number;
  locationName: string;
  driverName: string;
  time: Date;
  notes: string;
};

export type Coordinate = {
  lat: number;
  lng: number;
};

export type GraphData = {
  x: number;
  y: number;
};

interface GraphInfoBase {
  label: string;
}

export interface GraphInfo extends GraphInfoBase {
  data: GraphData[][];
}

// Used for both live and historical graphs,
// because the historical graph may also need to update
// from time to time in the future.
export interface ObservableGraphInfo extends GraphInfoBase {
  updates: BehaviorSubject<GraphData[][]>;
}

export type DoubleGraphData = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export interface FaultData {
  node: string;
  name: string;
  occurredAt: Date;
  lastSeen: Date;
  expired: boolean;
}

export interface FaultNode {
  node: string;
  data: FaultData[];
}

export interface Timing {
  time: number;
  before: number;
  after: number;
}
