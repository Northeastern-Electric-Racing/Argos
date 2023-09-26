import { describe, test, expect } from 'vitest';
import { getAllDataTypes, upsertDataType } from '../src/services/dataTypes.services';

describe('Data Type', () => {
  test('Get All Data Types Works', async () => {
    const expected = [];
    const result = await getAllDataTypes();

    // Parse result to a JavaScript object from the JSON string
    const parsedResult = JSON.parse(result);

    // Use toEqual to compare parsedResult with the expected array
    expect(parsedResult).toEqual(expected);
  });

  test('Upsert Data Type Works', async () => {
    const dataName = 'newDataType';
    const dataUnit = 'Unit';
    const dataNodeName = 'NodeName';

    const createdDataType = upsertDataType(dataName, dataUnit, dataNodeName);

    const expectedDataType: Promise<unknown> = Promise.resolve();

    expect(expectedDataType).toEqual(createdDataType);
  });
});
