/**
 * Frontend type of a Node
 */
export type Node = {
  name: string;
  dataTypes: DataType[];
};

/**
 * Frontend type of a Node with a boolean for whether the data types are visible
 */
export interface NodeWithVisibilityToggle extends Node {
  dataTypesAreVisible: boolean;
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
  systemName: string;
  time: Date;
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
