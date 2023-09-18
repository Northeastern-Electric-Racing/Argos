import prisma from '../prisma/prisma-client';

/**
 * CRUD operation to get all systems with ResponseFunction type
 * @returns Promise<string> contianing all the systems in the db
 */
export async function getAllSystems(): Promise<string> {
  const data = await prisma.system.findMany();
  return JSON.stringify(data);
}

/**
 * CRUD opertation that creates system if it doesn't exist, otherwise does nothing.
 * Currently designated private so not hooked up to server.
 * @param system_name name of the system as string
 * @returns Promise<void>
 */
export async function upsertSystems(system_name: string): Promise<void> {
  await prisma.system.upsert({
    where: {
      name: system_name
    },
    update: {},
    create: {
      name: system_name,
      runs: undefined,
    }
  });
}
