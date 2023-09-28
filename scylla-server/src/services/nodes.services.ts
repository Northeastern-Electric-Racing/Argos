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

/**
 * CRUD opertation that creates node if it doesn't exist, otherwise does nothing.
 * Currently designated private so not hooked up to server.
 * @param nodeName name of the system as string
 * @returns Promise<void>
 */
export const upsertNode = async (nodeName: string) => {
  await prisma.node.upsert({
    where: {
      name: nodeName
    },
    update: {},
    create: {
      name: nodeName
    }
  });
};
