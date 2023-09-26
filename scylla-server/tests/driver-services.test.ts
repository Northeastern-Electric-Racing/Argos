import { describe, test, expect } from 'vitest';
import { getAllDrivers, upsertDriver } from '../src/services/driver.services';

/**
 * Tests for CRUD Service functions
 */
describe('CRUD Driver', () => {
  /**
   * unit test for get all drivers
   */
  test('Get All Drivers Works', async () => {
    const expected = [{ username: 'test' }];
    const result = await getAllDrivers();

    // Parse result to a JavaScript object from the JSON string
    const parsedResult = JSON.parse(result);

    // Use toEqual to compare parsedResult with the expected array
    expect(parsedResult).toEqual(expected);
  });

  /**
   * Unit testing for upsert driver
   * test driver creation if the name doesn't already exist
   * */
  test('Upsert Driver Creates', async () => {
    const expected = [{ username: 'test' }];
    await upsertDriver('test');
    const result = JSON.parse(await getAllDrivers());

    expect(result).toEqual(expected);
  });
});
