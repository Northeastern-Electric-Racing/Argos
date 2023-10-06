import { System } from '@prisma/client';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/response-function';
import RunService from './runs.services';

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
   * CRUD opertation that creates system if it doesn't exist, connects the system to the current run
   * Currently designated private so not hooked up to server.
   * @param systemName name of the system as string
   * @param runId id of the run that the system is currently associated with
   * @returns the created system
   */
  static upsertSystem = async (systemName: string, runId: number): Promise<System> => {
    const system = await prisma.system.upsert({
      where: {
        name: systemName
      },
      update: {},
      create: {
        name: systemName
      }
    });

    await RunService.getRunById(runId);

    await prisma.run.update({
      where: {
        id: runId
      },
      data: {
        system: {
          connect: {
            name: systemName
          }
        }
      }
    });

    return system;
  };
}
