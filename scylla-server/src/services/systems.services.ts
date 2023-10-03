import { System } from '@prisma/client';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/response-function';

export default class SystemService {
  /**
   * CRUD operation to get all systems with ResponseFunction type
   * @returns Promise<string> contianing all the systems in the db
   */
  static getAllSystems: ResponseFunction<System[]> = async () => {
    const data = await prisma.system.findMany();
    return data;
  };

  /**
   * CRUD opertation that creates system if it doesn't exist, otherwise does nothing.
   * Currently designated private so not hooked up to server.
   * @param systemName name of the system as string
   * @returns the created system
   */
  static upsertSystem = async (systemName: string): Promise<System> => {
    return await prisma.system.upsert({
      where: {
        name: systemName
      },
      update: {},
      create: {
        name: systemName
      }
    });
  };
}
