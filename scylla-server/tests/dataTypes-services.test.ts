import { describe, test, expect } from 'vitest';
import { getAllDataTypes } from '../src/services/dataTypes.services';

describe('Data Type', () => {
  test('Get All Data Types Works', async () => {
    const expected = [];
    const data = {} as JSON
    const result = await getAllDataTypes(data);

    // Parse result to a JavaScript object from the JSON string
    const parsedResult = JSON.parse(result);

    // Use toEqual to compare parsedResult with the expected array
    expect(parsedResult).toEqual(expected);
  });
});
