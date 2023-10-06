import { Location } from '@prisma/client';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/response-function';
import RunService from './runs.services';

export default class LocationService {
  /**
   * CRUD operation to get all locations
   * @returns Array of all Locations
   */
  static getAllLocations: ResponseFunction<Location[]> = async () => {
    const locations = await prisma.location.findMany();
    return locations;
  };

  /**
   * Upserts a location to the database
   * @param name The name of the location
   * @param latitude the latitude of the location
   * @param longitude the longitude of the location
   * @param radius the radius of the location
   * @param runId the id of the run associated with the location
   * @returns the location
   */
  static upsertLocation = async (
    name: string,
    latitude: number,
    longitude: number,
    radius: number,
    runId: number
  ): Promise<Location> => {
    const location = await prisma.location.upsert({
      where: {
        name
      },
      update: {
        latitude,
        longitude,
        radius
      },
      create: {
        name,
        latitude,
        longitude,
        radius
      }
    });

    await RunService.getRunById(runId);

    await prisma.run.update({
      where: {
        id: runId
      },
      data: {
        location: {
          connect: {
            name
          }
        }
      }
    });

    return location;
  };
}
