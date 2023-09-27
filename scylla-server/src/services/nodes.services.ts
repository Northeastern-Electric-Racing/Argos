import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/message-maps.utils';

/**
 * CRUD operation to get all systems with ResponseFunction type
 * @returns Promise<string> contianing all the nodes in the db
 */
export const getAllNodes: ResponseFunction = async () => {
  const data = await prisma.node.findMany();
  return JSON.stringify(data);
};
