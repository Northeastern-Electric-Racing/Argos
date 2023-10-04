import { describe, test, expect } from 'vitest';
import DataTypeService from '../src/services/dataTypes.services';

describe('Data Type', () => {
  test('Get All Data Types Works', async () => {
    const expected = [];
    const result = await DataTypeService.getAllDataTypes();

    // Use toEqual to compare parsedResult with the expected array
    expect(result).toEqual(expected);
  });
});
