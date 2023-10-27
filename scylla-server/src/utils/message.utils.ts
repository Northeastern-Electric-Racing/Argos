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
  name: string;
  value: number | string;
  units: string;
  timestamp: number;
};
