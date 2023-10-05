import { JsonObject } from '@prisma/client/runtime/library';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/response-function';
import { InvalidDataError, NotFoundError } from '../utils/errors.utils';
import { Data } from '@prisma/client';
import { ServerData } from '../odyssey-base/src/types/message.types';

/**
 * Type of data needed for getting data by dataTypeName
 */
export type DataTypeName = {
  dataTypeName: string;
};

/**
 * Service class for handling data
 */
export default class DataService {
  /**
   * CRUD operation to get all the data for a given datatype name
   * @returns string contianing list of all data with dataype name
   */
  static getDataByDataTypeName: ResponseFunction<Data[]> = async (data?: JsonObject) => {
    const validData = data as DataTypeName;
    if (!validData || !validData.dataTypeName) {
      throw InvalidDataError(validData, 'DataTypeName');
    }
    const queriedData = await prisma.data.findMany({
      where: {
        dataTypeName: validData.dataTypeName
      }
    });
    return queriedData;
  };

  static addData = async (serverData: ServerData, unixTime: number, runId: number, value: number): Promise<Data> => {
    const dataType = await prisma.dataType.findUnique({
      where: {
        name: serverData.name
      }
    });

    if (!dataType) {
      throw NotFoundError('dataType', serverData.name);
    }

    return await prisma.data.create({
      data: { dataType: { connect: { name: serverData.name } }, time: unixTime, run: { connect: { id: runId } }, value }
    });
  };
}
