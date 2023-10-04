/**
 * The format of a message sent to the client
 */
export type ClientMessage = {
  data: ClientData[];
};

/**
 * The format of the data sent to the client
 */
type ClientData = {
  name: string;
  value: number;
  units: string;
  timestamp: number;
};
