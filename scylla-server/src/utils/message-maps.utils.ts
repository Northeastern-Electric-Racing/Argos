import { getAllDataTypes } from '../odyssey-base/services/dataTypes.services';
import { getAllDrivers } from '../odyssey-base/services/driver.services';
import { getAllSystems } from '../odyssey-base/services/systems.services';
import { ResponseFunction } from '../odyssey-base/src/types/message.types';

/**
 * Creates a map of messages received from the client to functions that handle the messages
 * @returns A map of client messages to functions that handle the messages
 */
export const createClientMessageMap = (): Map<string, ResponseFunction> => {
  const clientMessageMap = new Map<string, ResponseFunction>();
  clientMessageMap.set('getAllSystems', getAllSystems);
  clientMessageMap.set('getAllDataTypes', getAllDataTypes);
  clientMessageMap.set('getAllDrivers', getAllDrivers);
  return clientMessageMap;
};
