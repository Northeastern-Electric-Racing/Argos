export type ServerMessage = {
  unix_time: number;
  node: string;
  data: ServerData[];
};

type ServerData = {
  name: string;
  value: number;
  units: string;
};

export type ClientMessage = {
  argument: string;
  data: JSON;
}