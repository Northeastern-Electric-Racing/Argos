import { JsonObject } from '@prisma/client/runtime/library';

/**
 * Custom Error message based on given invalid data and name of expected data type
 * @param data invalid JsonObject
 * @param typeName name of expected DataType as string
 */
export const InvalidDataError = (data: JsonObject, typeName: string) => {
  throw new Error(`Invalid data provided, Expected data of type ${typeName} and got ${JSON.stringify(data)}`);
};
