import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/message-maps.utils';

/**
 * CRUD operation to get all dataTypes
 * @returns string containing all the dataTypes
 */
export const getAllDataTypes: ResponseFunction = async () => {
  const data = await prisma.dataType.findMany();
  return JSON.stringify(data);
};
