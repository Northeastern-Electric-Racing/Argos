import { describe, test, expect, afterEach } from 'vitest';
import DriverService from '../src/services/driver.services';
import prisma from '../src/prisma/prisma-client';

/**
 * Tests for CRUD Service functions
 */
describe('CRUD Driver', () => {
  afterEach(async () => {
    try {
      await prisma.driver.delete({
        where: {
          username: 'test'
        }
      });
    } catch (err) {}
  });

  /**
   * unit test for get all drivers
   */
  test('Get All Drivers Works', async () => {
    const expected = [];
    const result = await DriverService.getAllDrivers();

    // Use toEqual to compare parsedResult with the expected array
    expect(result).toEqual(expected);
  });

  /**
   * Unit testing for upsert driver
   * test driver creation if the name doesn't already exist
   * */
  test('Upsert Driver Creates', async () => {
    const expected = [{ username: 'test' }];
    await DriverService.upsertDriver('test');
    const result = await DriverService.getAllDrivers();

    expect(result).toEqual(expected);
  });
});
