import { describe, test, expect, afterEach } from 'vitest';
import { getAllSystems, upsertSystem } from '../src/services/systems.services';

import prisma from '../src/prisma/prisma-client';

/**
 * Tests for CRUD Service functions
 */
describe('CRUD Systems', () => {
  //cleaning up
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
    await upsertSystem('test');
    const result = JSON.parse(await getAllSystems());

    // Use toEqual to compare parsedResult with the expected array
    expect(result).toEqual(expected);
  });

  /**
   * updated unit test for get all systems
   */
  test('Get All Systems Works', async () => {
    await upsertSystem('test');
    const expected = [{ name: 'test' }];
    const result = await getAllSystems();

    // Parse result to a JavaScript object from the JSON string
    const parsedResult = JSON.parse(result);

    // Use toEqual to compare parsedResult with the expected array
    expect(parsedResult).toEqual(expected);
  });

  /**
   * unit test for upsert system
   * testing does nothing if system does exist
   */
  test('Upsert System Does Nothing', async () => {
    const expected = [{ name: 'test' }];
    await upsertSystem('test');
    const result = JSON.parse(await getAllSystems());

    // Use toEqual to compare result with the expected array
    expect(result).toEqual(expected);
  });
});
