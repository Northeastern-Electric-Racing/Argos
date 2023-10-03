import { describe, test, expect, afterEach } from 'vitest';
import DataService from '../src/services/data.services';
import prisma from '../src/prisma/prisma-client';

/**
 * Unit Tests for Data
 */
describe('Data', () => {
  afterEach(async () => {
    try {
      await prisma.dataType.delete({
        where: {
          name: 'test'
        }
      });
    } catch (error) {}
  });

  test('Get All Data by DataType Name works w valid data', async () => {
    const expected = [];

    const data = {
      dataTypeName: 'test'
    };
    const result = await DataService.getDataByDataTypeName(data);

    // Use toEqual to compare parsedResult with the expected array
    expect(result).toEqual(expected);
  });

  test('Get All Data by DataType Name throws w invalid data', async () => {
    //throws w no data
    await expect(() => DataService.getDataByDataTypeName()).rejects.toThrowError(
      'Invalid data provided, Expected data of type DataTypeName and got undefined'
    );
    //throws with bad data
    const badData = JSON.parse('{"bruh": "test"}');
    await expect(() => DataService.getDataByDataTypeName(badData)).rejects.toThrowError(
      `Invalid data provided, Expected data of type DataTypeName and got {"bruh":"test"}`
    );
  });
});
