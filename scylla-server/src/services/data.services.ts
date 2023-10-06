import prisma from '../prisma/prisma-client';
import { NotFoundError } from '../utils/errors.utils';
import { Data } from '@prisma/client';
import { ServerData } from '../odyssey-base/src/types/message.types';

/**
 * Service class for handling data
 */
export default class DataService {
  /**
   * CRUD operation to get all the data for a given datatype name
   * @param dataTypeName name of the dataType to get data for
   * @returns string contianing list of all data with dataype name
   */
  static getDataByDataTypeName = async (dataTypeName: string) => {
    const dataType = await prisma.dataType.findUnique({
      where: {
        name: dataTypeName
      }
    });

    if (!dataType) {
      throw NotFoundError('dataType', dataTypeName);
    }

    const queriedData = await prisma.data.findMany({
      where: {
        dataTypeName
      }
    });

    return queriedData;
  };

  /**
   * Adds data to the database
   * @param serverData The data to add
   * @param unixTime the timestamp of the data
   * @param value the value of the data
   * @param runId the id of the run associated with the data
   * @returns The created data type
   */
  static addData = async (serverData: ServerData, unixTime: number, value: number, runId: number): Promise<Data> => {
    const dataType = await prisma.dataType.findUnique({
      where: {
        name: serverData.name
      }
    });

    if (!dataType) {
      throw NotFoundError('dataType', serverData.name);
    }

    const run = await prisma.run.findUnique({
      where: {
        id: runId
      }
    });

    if (!run) {
      throw NotFoundError('run', runId);
    }

    return await prisma.data.create({
      data: { dataType: { connect: { name: dataType.name } }, time: unixTime, run: { connect: { id: run.id } }, value }
    });
  };
}
