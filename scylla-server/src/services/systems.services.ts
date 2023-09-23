import prisma from '../odyssey-base/src/prisma/prisma-client';
import { ResponseFunction } from '../utils/message-maps.utils';

/**
 * CRUD operation to get all systems with ResponseFunction type
 * @returns Promise<string> contianing all the systems in the db
 */
export const getAllSystems: ResponseFunction = async () => {
  const data = await prisma.system.findMany();
  return JSON.stringify(data);
};

/**
 * CRUD opertation that creates system if it doesn't exist, otherwise does nothing.
 * Currently designated private so not hooked up to server.
 * @param systemName name of the system as string
 * @returns Promise<void>
 */
export const upsertSystem = async (systemName: string) => {
  await prisma.system.upsert({
    where: {
      name: systemName
    },
    update: {},
    create: {
      name: systemName
    }
  });
};
