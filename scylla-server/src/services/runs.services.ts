import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../types/message.types';



/**
 * CRUD operation to get all runs  
 * @returns Promise<string>  all the runs  
 */
export const getAllRuns: ResponseFunction = async () => {
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
        id: id
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
        id: id
      },
      update: {
        locationName: locationName
      },
      create: {
        id: id,
        locationName: locationName,
        time: new Date(),
      }
    });
  };

  export const upsertLocation = async (  name: string, latitude: number, longitude: number, radius: number ) => {
      await prisma.location.upsert({
        where: {
            name: name
        },
        update: {
           latitude: latitude,
           longitude: longitude,
           radius: radius
        },
        create: {
          name: name,
           latitude: latitude,
           longitude: longitude,
           radius: radius
        }
      });
    };
  

 