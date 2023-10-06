import { describe, test, expect, afterEach } from 'vitest';
import RunService from '../src/services/runs.services';
import LocationService from '../src/services/locations.services';
import prisma from '../src/prisma/prisma-client';

describe('CRUD Run', () => {
  /**
   * Clean up after each test
   */
  afterEach(async () => {
    try {
      await prisma.run.deleteMany({
        where: {
          locationName: 'test'
        }
      });
    } catch (error) {}
    try {
      await prisma.location.delete({
        where: {
          name: 'test'
        }
      });
    } catch (error) {}
  });

  /**
   * Tests Gets All Runs Succeeds Correctly
   */
  test('Get All runs', async () => {
    await LocationService.upsertLocation('test', 100, 200, 300);
    await RunService.createRun('test', 1);

    const result = await RunService.getAllRuns();

    expect(result).toEqual([
      {
        id: result[0].id,
        locationName: 'test',
        time: 1,
        driverId: null,
        systemId: null
      }
    ]);
  });

  /**
   * Tests Get Run By Id Succeeds Correctly
   */
  test('Get run by id', async () => {
    await LocationService.upsertLocation('test', 100, 200, 300);
    const createdRun = await RunService.createRun('test', 1);

    const result = await RunService.getRunById(createdRun.id);

    expect(result).toEqual({
      id: createdRun.id,
      locationName: 'test',
      time: 1,
      driverId: null,
      systemId: null
    });
  });

  /**
   * Test Create Run Fails When location does not exist
   */
  test('Get run by id fails with invalid location name', async () => {
    await expect(() => RunService.createRun('test', 1)).rejects.toThrowError('location with id test not found');
  });
});
