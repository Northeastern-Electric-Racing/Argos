import { Run } from '@prisma/client';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/response-function';
import { NotFoundError } from '../utils/errors.utils';

/**
 * Service for CRUD operations on runs
 */
export default class RunService {
  /**
   * Gets all the runs from the database
   * CRUD operation to get all runs
   * @returns Promise<Run[]>  all the runs
   */
  static getAllRuns: ResponseFunction<Run[]> = async () => {
    return await prisma.run.findMany();
  };

  /**
   * CRUD operation to get run by id
   * @param id id of run
   * @returns Promise<Run>
   */
  static getRunById = async (id: number): Promise<Run> => {
    const run = await prisma.run.findUnique({
      where: {
        id
      }
    });
    if (!run) {
      throw NotFoundError('run', id);
    }
    return run;
  };

  /**
   * Creates a new run in the database
   * @param locationName  locationName of run
   * @returns Promise<Run>
   */
  static createRun = async (locationName: string, timestamp: number) => {
    const location = await prisma.location.findUnique({
      where: {
        name: locationName
      }
    });

    if (!location) {
      throw NotFoundError('location', locationName);
    }

    const run = await prisma.run.create({
      data: {
        location: { connect: { name: locationName } },
        time: timestamp
      }
    });
    return run;
  };
}
