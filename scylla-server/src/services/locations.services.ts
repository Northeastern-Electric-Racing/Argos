import prisma from '../prisma/prisma-client';

/**
 * upserts location by name
 * @param locName
 * @param locLatitude
 * @param locLongitude
 * @param locRadius
 */
export const upsertLocation = async (locName: string, locLatitude: number, locLongitude: number, locRadius: number) => {
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
