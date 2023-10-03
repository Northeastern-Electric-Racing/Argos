import { DataType } from '@prisma/client';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/response-function';

/**
 * Service class to handle data types
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
}
