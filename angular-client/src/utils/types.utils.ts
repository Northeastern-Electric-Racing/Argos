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

export type DoubleGraphData = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};
