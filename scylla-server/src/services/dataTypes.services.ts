import { DataType } from '@prisma/client';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/response-function';

/**
 * Service for dataTypes
 */
export default class DataTypeService {
  /**
   * CRUD operation to get all dataTypes
   * @returns string containing all the dataTypes
   */
  static getAllDataTypes: ResponseFunction<DataType[]> = async () => {
    const data = await prisma.dataType.findMany();
    return data;
  };

  /**
   * CRUD operation to upsert the data types if it does not exist, updates if it does
   * @param dataTypeName name of the dataType
   */
  static upsertDataType = async (dataTypeName: string, unit: string, nodeName: string): Promise<DataType> => {
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
}
