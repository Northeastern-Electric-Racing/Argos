import { DataType } from '@prisma/client';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/message-maps.utils';

/**
 * CRUD operation to get all dataTypes
 * @returns string containing all the dataTypes
 */

export const getAllDataTypes: ResponseFunction = async () => {
  const data = await prisma.dataType.findMany();
  return JSON.stringify(data);
};

export const upsertDataType = async (dataTypeName: string, unit: string, nodeName: string): Promise<DataType> => {
  const createdDataType = prisma.dataType.upsert({
    where: { name: dataTypeName },
    create: {
      name: dataTypeName,
      unit,
      nodeName
    },
    update: {
      unit,
      nodeName
    }
  });
  return createdDataType;
};
