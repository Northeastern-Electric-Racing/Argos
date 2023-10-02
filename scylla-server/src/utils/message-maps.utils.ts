import { getAllDataTypes } from '../services/dataTypes.services';
import { getAllDrivers } from '../services/driver.services';
import { getAllSystems } from '../services/systems.services';
import { getDataByDataTypeName } from '../services/data.services';
import { getAllNodes } from '../services/nodes.services';
import { JsonObject } from '@prisma/client/runtime/library';

export type ResponseFunction = (data?: JsonObject) => Promise<string>;

type Argument = 'getAllSystems' | 'getAllDataTypes' | 'getAllDrivers' | 'getDataByDataTypeName' | 'getAllNodes';
/**
 * Creates a map of messages received from the client to functions that handle the messages
 * @returns A map of client messages to functions that handle the messages
 */
export const createClientMessageMap = (): Map<Argument, ResponseFunction> => {
  const clientMessageMap = new Map<Argument, ResponseFunction>();
  clientMessageMap.set('getAllSystems', getAllSystems);
  clientMessageMap.set('getAllDataTypes', getAllDataTypes);
  clientMessageMap.set('getAllDrivers', getAllDrivers);
  clientMessageMap.set('getDataByDataTypeName', getDataByDataTypeName);
  clientMessageMap.set('getAllNodes', getAllNodes);
  return clientMessageMap;
};
