import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/message-maps.utils';

/**
 * CRUD operation to get all systems with ResponseFunction type
 * @returns string contianing all the systems in the db
 */

export const getAllSystems: ResponseFunction = async () => {
  const data = await prisma.system.findMany();
  return JSON.stringify(data);
};
