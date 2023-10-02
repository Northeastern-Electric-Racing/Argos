import { describe, test, expect } from 'vitest';
import { getRunById, getAllRuns, upsertRun, upsertLocation } from '../src/services/runs.services';

describe('CRUD Run', () => {
  /**
   * get runs
   */
  test('Get All runs', async () => {
    await upsertLocation('Boston', 100, 200, 300);
    await upsertRun(100, 'Boston');
    const result = JSON.parse(await getAllRuns());
    expect(Object.keys(result).length).toEqual(1);
  });

  test('Get run by id', async () => {
    await upsertLocation('Boston', 100, 200, 300);
    await upsertRun(100, 'Boston');

    const result = JSON.parse(await getRunById(100));

    expect(result.id).toEqual(100);
    expect(result.locationName).toEqual('Boston');
  });
});
