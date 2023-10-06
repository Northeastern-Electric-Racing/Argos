import { describe, test, expect, afterEach } from 'vitest';
import RunService from '../src/services/runs.services';
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
    await RunService.createRun(1);

    const result = await RunService.getAllRuns();

    expect(result).toEqual([
      {
        id: result[0].id,
        locationName: null,
        time: 1,
        driverName: null,
        systemName: null
      }
    ]);
  });

  /**
   * Tests Get Run By Id Succeeds Correctly
   */
  test('Get run by id', async () => {
    const createdRun = await RunService.createRun(1);

    const result = await RunService.getRunById(createdRun.id);

    expect(result).toEqual({
      id: createdRun.id,
      locationName: null,
      time: 1,
      driverName: null,
      systemName: null
    });
  });
});
