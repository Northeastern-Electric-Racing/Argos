import prisma from '../prisma/prisma-client';

/**
 * CRUD operation to get all runs
 * @returns Promise<string>  all the runs
 */
export const getAllRuns = async () => {
  const data = await prisma.run.findMany();
  return JSON.stringify(data);
};

/**
 * CRUD operation to get run by id
 * @param id id of run
 * @returns Promise<json string of run>
 */
export const getRunById = async (id: number) => {
  const data = await prisma.run.findUnique({
    where: {
      id
    }
  });

  return JSON.stringify(data);
};

/**
 * @param id id of run
 * @param locationName  locationName of run
 * @returns Promise<void>
 */
export const upsertRun = async (id: number, locationName: string) => {
  await prisma.run.upsert({
    where: {
      id
    },
    update: {
      locationName
    },
    create: {
      id,
      locationName,
      time: new Date()
    }
  });
};

export const upsertLocation = async (name: string, latitude: number, longitude: number, radius: number) => {
  await prisma.location.upsert({
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
};
