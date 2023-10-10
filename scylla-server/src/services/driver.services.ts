import { Driver } from '@prisma/client';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/response-function';
import RunService from './runs.services';

/**
 * Service class to handle drivers
 */
export default class DriverService {
  /**
   * CRUD operation to get all dataTypes
   * @returns string containing all the dataTypes
   */
  static getAllDrivers: ResponseFunction<Driver[]> = async () => {
    const data = await prisma.driver.findMany();
    return data;
  };

  /**
   * CRUD operation to create a driver in the database if it doesn't already exist, does nothing otherwise.
   * @param driverName name of the driver as string
   * @param runId id of the run that the driver is currently associated with
   * @returns the created driver
   */
  static upsertDriver = async (driverName: string, runId: number): Promise<Driver> => {
    const driver = await prisma.driver.upsert({
      where: {
        username: driverName
      },
      update: {},
      create: {
        username: driverName
      }
    });

    await RunService.getRunById(runId);

    await prisma.run.update({
      where: {
        id: runId
      },
      data: {
        driver: {
          connect: {
            username: driverName
          }
        }
      }
    });

    return driver;
  };
}
