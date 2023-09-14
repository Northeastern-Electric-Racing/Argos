import { getAllSystems } from '../services/systems.services';

export type ResponseFunction = (data: JSON) => Promise<string>;

/**
 * Creates a map of server messages to functions that handle the messages
 * @returns A map of server messages to functions that handle the messages
 */
export const createServerMessageMap = (): Map<string, ResponseFunction> => {
  const serverMessageMap = new Map<string, ResponseFunction>();
  return serverMessageMap;
};

/**
 * Creates a map of client messages to functions that handle the messages
 * @returns A map of client messages to functions that handle the messages
 */
export const createClientMessageMap = (): Map<string, ResponseFunction> => {
  const clientMessageMap = new Map<string, ResponseFunction>();
  clientMessageMap.set('getAllSystems', getAllSystems);
  return clientMessageMap;
};
