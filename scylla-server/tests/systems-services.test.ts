import { describe, test, expect, afterEach, afterAll } from 'vitest';
import SystemService from '../src/services/systems.services';
import prisma from '../src/prisma/prisma-client';
import RunService from '../src/services/runs.services';

/**
 * Tests for CRUD Service functions
 */
describe('CRUD Systems', () => {
  /**
   * Delete the run after all tests are done
   */
  afterAll(async () => {
    await prisma.run.deleteMany({
      where: {
        time: 1
      }
    });
  });

  afterEach(async () => {
    try {
      await prisma.system.delete({
        where: {
          name: 'test'
        }
      });
    } catch (err) {}
  });

  /**
   * unit test for upsert system
   * testing creating system if doesn't exist
   */
  test('Upsert System Creates', async () => {
    const expected = [{ name: 'test' }];
    await SystemService.upsertSystem('test', (await RunService.createRun(1)).id);
    const result = await SystemService.getAllSystems();

    // Use toEqual to compare parsedResult with the expected array
    expect(result).toEqual(expected);
  });

  /**
   * updated unit test for get all systems
   */
  test('Get All Systems Works', async () => {
    await SystemService.upsertSystem('test', (await RunService.createRun(1)).id);
    const expected = [{ name: 'test' }];
    const result = await SystemService.getAllSystems();

    // Use toEqual to compare parsedResult with the expected array
    expect(result).toEqual(expected);
  });

  /**
   * unit test for upsert system
   * testing does nothing if system does exist
   */
  test('Upsert System Does Nothing', async () => {
    const expected = [{ name: 'test' }];
    await SystemService.upsertSystem('test', (await RunService.createRun(1)).id);
    const result = await SystemService.getAllSystems();

    // Use toEqual to compare result with the expected array
    expect(result).toEqual(expected);
  });
});
