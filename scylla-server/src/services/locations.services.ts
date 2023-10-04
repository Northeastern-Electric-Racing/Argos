import { Location } from '@prisma/client';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/response-function';

export default class LocationService {
  /**
   * CRUD operation to get all locations
   * @returns
   */
  static getAllLocations: ResponseFunction<Location[]> = async () => {
    const data = await prisma.location.findMany();
    return data;
  };
  /**
   * upserts location by name
   * @param locName
   * @param locLatitude
   * @param locLongitude
   * @param locRadius
   */
  static upsertLocation = async (locName: string, locLatitude: number, locLongitude: number, locRadius: number) => {
    return await prisma.location.upsert({
      where: {
        name: locName
      },
      update: {
        latitude: locLatitude,
        longitude: locLongitude,
        radius: locRadius
      },
      create: {
        name: locName,
        latitude: locLatitude,
        longitude: locLongitude,
        radius: locRadius
      }
    });
  };
}
