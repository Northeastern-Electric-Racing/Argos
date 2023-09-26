import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/message-maps.utils';

/**
 * Type of data needed for getting data by dataTypeName
 */
type DataTypeName = {
  dataTypeName: string;
};

/**
 * Casts and validates given JSON data, otherwise throws error
 * @param jsonData the given JSON data
 * @returns DataTypeName
 */
function castAndValidate(jsonData: JSON | undefined): DataTypeName {
  if (
    typeof jsonData === 'object' &&
    jsonData !== null &&
    'dataTypeName' in jsonData &&
    typeof jsonData.dataTypeName === 'string'
  ) {
    return jsonData as DataTypeName;
  }
  throw new Error('Provided JSON data is invalid');
}

/**
 * CRUD operation to get all the data for a given datatype name
 * @returns string contianing list of all data with dataype name
 */
export const getDataByDataTypeName: ResponseFunction = async (data: JSON | undefined) => {
  const validData = castAndValidate(data);
  const queriedData = await prisma.data.findMany({
    where: {
      dataTypeName: validData.dataTypeName
    }
  });
  return JSON.stringify(queriedData);
};
