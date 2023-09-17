import { Topic } from './topics.utils';

/**
 * The format of a message sent from the server
 */
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

/**
 * The format of a message sent from the client
 */
export type ClientMessage = {
  argument: string;
  data: JSON;
};

/**
 * The format of the message sent to subscribe or unsubscribe from a topic
 */
export type SubscriptionMessage = {
  argument: SubscriptionArgument;
  topics: Topic[];
};

type SubscriptionArgument = 'subscribe' | 'unsubscribe';
