import { Topic } from './topics.utils';

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
};

export type SubscriptionArgument = 'subscribe' | 'unsubscribe';

export type SubscriptionMessage = {
  argument: SubscriptionArgument;
  topics: Topic[];
};
