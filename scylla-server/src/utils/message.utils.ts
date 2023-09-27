import { JsonObject } from '@prisma/client/runtime/library';

/**
 * The format of a message sent from the client
 */
export type ClientMessage = {
  argument: string;
  data: JsonObject;
};
