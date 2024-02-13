/**
 * The format of a message sent to the client
 */
export type ClientMessage = {
  data: ClientData[];
};

/**
 * The format of the data sent to the client
 */
export type ClientData = {
  runId: number;
  name: string;
  unit: string;
  value:string[] | number[]  ;
  timestamp: number;
};
