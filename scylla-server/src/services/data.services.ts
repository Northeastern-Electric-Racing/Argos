import { JsonObject } from '@prisma/client/runtime/library';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/response-function';
import { InvalidDataError } from '../utils/errors.utils';
import { Data } from '@prisma/client';
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
}

/**
 * CRUD operation to upsert Data
 * @param dataID id of the data
 * @param dataName dataTypeName field of the data
 * @param dataValue value of dta
 * @param dataTime time data was received
 * @param runID id of the corresponding run
 */
export const upsertData = async (dataID: number, dataName: string, dataValue: number, dataTime: number, runID: number) => {
  await prisma.data.upsert({
    where: {
      id: dataID
    },
    update: {
      dataTypeName: dataName,
      value: dataValue,
      time: dataTime
    },
    create: {
      id: dataID,
      value: dataValue,
      dataTypeName: dataName,
      time: dataTime,
      runId: dataID
    }
  });
};
