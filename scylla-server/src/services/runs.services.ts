import { Run } from '@prisma/client';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/response-function';

/**
 * CRUD operation to get all runs
 * @returns Promise<string>  all the runs
 */
export const getAllRuns: ResponseFunction<Run[]> = async () => {
  const data = await prisma.run.findMany();
  return data;
};

/**
 * CRUD operation to get run by id
 * @param runId id of run
 * @returns Promise<json string of run>
 */
export const getRunById = async (runId: number) => {
  const data = await prisma.run.findUnique({
    where: {
      id: runId
    }
  });

  return JSON.stringify(data);
};

/**
 * CRUD operation to upsert a Run by id
 * @param runId id of run
 * @param runLocationName  locationName of run
 * @returns Promise<void>
 */
export const upsertRun = async (runId: number, runLocationName: string) => {
  return await prisma.run.upsert({
    where: {
      id: runId
    },
    update: {
      locationName: runLocationName
    },
    create: {
      id: runId,
      locationName: runLocationName,
      time: new Date()
    }
  });
};
