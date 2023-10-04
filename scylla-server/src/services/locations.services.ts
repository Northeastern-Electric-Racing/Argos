import { Location } from '@prisma/client';
import prisma from '../prisma/prisma-client';

/**
 * Service class to handle location crud operations
 */
export default class LocationService {
  /**
   * Upserts a location to the database
   * @param name The name of the location
   * @param latitude the latitude of the location
   * @param longitude the longitude of the location
   * @param radius the radius of the location
   * @returns the location
   */
  static upsertLocation = async (name: string, latitude: number, longitude: number, radius: number): Promise<Location> => {
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

    return location;
  };
}
