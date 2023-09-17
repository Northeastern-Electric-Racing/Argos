import { getAllSystems } from '../services/systems.services';

export type ResponseFunction = (data: JSON) => Promise<string>;

/**
 * Creates a map of messages received from the client to functions that handle the messages
 * @returns A map of client messages to functions that handle the messages
 */
export const createClientMessageMap = (): Map<string, ResponseFunction> => {
  const clientMessageMap = new Map<string, ResponseFunction>();
  clientMessageMap.set('getAllSystems', getAllSystems);
  return clientMessageMap;
};
