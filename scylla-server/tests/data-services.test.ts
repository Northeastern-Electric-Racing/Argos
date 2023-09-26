import { describe, test, expect } from 'vitest';
import { getDataByDataTypeName } from '../src/services/data.services';

/**
 * Unit Tests for Data
 */
describe('Data', () => {
  test('Get All Data by DataType Name works w valid data', async () => {
    const expected = [];
    const data = JSON.parse('{"dataTypeName": "test"}');
    const result = await getDataByDataTypeName(data);

    // Parse result to a JavaScript object from the JSON string
    const parsedResult = JSON.parse(result);

    // Use toEqual to compare parsedResult with the expected array
    expect(parsedResult).toEqual(expected);
  });

  test('Get All Data by DataType Name throws w invalid data', async () => {
    //throws w no data
    await expect(() => getDataByDataTypeName()).rejects.toThrowError(
      'Invalid data provided, Expected data of type DataTypeName and got undefined'
    );
    //throws with bad data
    const badData = JSON.parse('{"bruh": "test"}');
    await expect(() => getDataByDataTypeName(badData)).rejects.toThrowError(
      `Invalid data provided, Expected data of type DataTypeName and got {"bruh":"test"}`
    );
  });
});