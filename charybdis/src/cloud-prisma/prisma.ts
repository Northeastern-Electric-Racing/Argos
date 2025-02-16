import { PrismaClient } from "./cloud-prisma-client";

export let prisma = new PrismaClient();

export function updatePrismaClient(databaseUrl?: string): PrismaClient {
  if (prisma && !databaseUrl) {
    return prisma; // Return existing instance if no new URL is provided
  }

  if (databaseUrl) {
    process.env.CLOUD_DATABASE_URL = databaseUrl; // Set new DB URL
  }

  prisma = new PrismaClient(); // Reinitialize Prisma
  return prisma;
}
