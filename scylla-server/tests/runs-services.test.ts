import { describe, test, expect } from 'vitest';
import { getRunById, getAllRuns, upsertRun } from '../src/services/runs.services';
import { upsertLocation } from '../src/services/locations.services';

describe('CRUD Run', () => {
  /**
   * get runs
   */
  test('Get All runs', async () => {
    const upsertloc = await upsertLocation('Boston', 100, 200, 300);
    const upsertrun = await upsertRun(100, 'Boston');
    const result = JSON.parse(await getAllRuns());
    expect(Object.keys(result).length).toEqual(1);
  }, 1000);

  test('Get run by id', async () => {
    const upsertloc = await upsertLocation('Boston', 100, 200, 300);
    const upsertrun = await upsertRun(100, 'Boston');

    const result = JSON.parse(await getRunById(100));

    expect(result.id).toEqual(100);
    expect(result.locationName).toEqual('Boston');
  }, 1000);
});
