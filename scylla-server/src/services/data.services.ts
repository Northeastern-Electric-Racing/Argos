import { JsonObject } from '@prisma/client/runtime/library';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/message-maps.utils';
import { InvalidDataError } from '../utils/errors.utils';

/**
 * Type of data needed for getting data by dataTypeName
 */
export type DataTypeName = {
  dataTypeName: string;
};

/**
 * CRUD operation to get all the data for a given datatype name
 * @returns string contianing list of all data with dataype name
 */
export const getDataByDataTypeName: ResponseFunction = async (data?: JsonObject) => {
  const validData = data as DataTypeName;
  if (!validData || !validData.dataTypeName) {
    throw InvalidDataError(validData, 'DataTypeName');
  }
  const queriedData = await prisma.data.findMany({
    where: {
      dataTypeName: validData.dataTypeName
    }
  });
  return JSON.stringify(queriedData);
};