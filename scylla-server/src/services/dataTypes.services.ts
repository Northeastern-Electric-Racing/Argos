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

/**
 * CRUD operation to upsert the data types if it does not exist, updates if it does
 */
export const upsertDataType = async (dataTypeName: string, unit: string, nodeName: string): Promise<DataType> => {
  if (!(await prisma.node.findUnique({ where: { name: nodeName } }))) {
    throw new Error(`Node with the name "${nodeName}" does not exist`);
  }

  const createdDataType = prisma.dataType.upsert({
    where: { name: dataTypeName },
    update: {
      unit,
      node: { connect: { name: nodeName } }
    },
    create: {
      name: dataTypeName,
      unit,
      node: { connect: { name: nodeName } }
    }
  });
  return createdDataType;
};
