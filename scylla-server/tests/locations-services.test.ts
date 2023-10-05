import { describe, test, expect, afterEach } from 'vitest';
import LocationService from '../src/services/locations.services';
import prisma from '../src/prisma/prisma-client';

describe('CRUD Location', () => {
  /**
   * Clean up after each test
   */
  afterEach(async () => {
    try {
      await prisma.location.delete({
        where: {
          name: 'test'
        }
      });
    } catch (error) {}
  });

  /**
   * Tests Upserts Location and Get All Locations work correctly
   */
  test('Get All Locations and Upsert', async () => {
    await LocationService.upsertLocation('test', 100, 200, 300);

    const result = await LocationService.getAllLocations();

    expect(result).toEqual([
      {
        latitude: 100,
        longitude: 200,
        name: 'test',
        radius: 300
      }
    ]);
  });
});
