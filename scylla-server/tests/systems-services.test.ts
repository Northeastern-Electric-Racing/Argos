import { describe, test, expect, afterAll } from 'vitest';
import { getAllSystems, upsertSystems } from '../src/services/systems.services';
import { getRunById, getAllRuns , upsertRun } from '../src/services/systems.services';

import prisma from '../src/prisma/prisma-client';

/**
 * Tests for CRUD Service functions
 */
describe('CRUD Systems', () => {
  /**
   * unit test for upsert system
   * testing creating system if doesn't exist
   */
  test('Upsert System Creates', async () => {
    const expected = [{ name: 'test' }];
    await upsertSystems('test');
    const result = JSON.parse(await getAllSystems());

    // Use toEqual to compare parsedResult with the expected array
    expect(result).toEqual(expected);
  });

  /**
   * updated unit test for get all systems
   */
  test('Get All Systems Works', async () => {
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
    await upsertSystems('test');
    const result = JSON.parse(await getAllSystems());

    // Use toEqual to compare result with the expected array
    expect(result).toEqual(expected);

    //cleaning up
    afterAll(async () => {
      await prisma.system.delete({
        where: {
          name: 'test'
        }
      });
    });
  });
});


describe('CRUD Run', () => {
   /**
    * get runs
    */
  test('Get All runs', async () => { 
 
  // assume system starts with 0
  await upsertRun(100, 'Boston');
  await upsertRun(200, 'New York');
  
  const result = JSON.parse(await getAllRuns ());
  const parsedResult = JSON.parse(result);
  expect(parsedResult.length).toEqual(2);
  });
  
  test('Get run by id', async () => { 
   
  // assume system starts with 0
  await upsertRun(100, 'Boston');
  const result = JSON.parse(await getRunById (100));
  const parsedResult = JSON.parse(result);
  expect(parsedResult.length).toEqual(1);
  });
  });
  
