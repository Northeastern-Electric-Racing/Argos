import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/message-maps.utils';

/**
 * CRUD operation to get all the data for a given datatype name
 * @returns string contianing list of all data with dataype name
 */
export const getDataByDataTypeName: ResponseFunction = async (data: JSON | undefined) => {
    const queriedData = await prisma.data.findMany({
    where: {
      dataTypeName: JSON.stringify(data)
    }
  });
  return JSON.stringify(queriedData);
};
