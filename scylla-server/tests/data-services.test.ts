import { describe, test, expect, afterEach, afterAll } from 'vitest';
import DataService from '../src/services/data.services';
import prisma from '../src/prisma/prisma-client';
import { ServerData } from '../src/odyssey-base/src/types/message.types';
import DataTypeService from '../src/services/dataTypes.services';
import NodeService from '../src/services/nodes.services';
import RunService from '../src/services/runs.services';
import { Data } from '@prisma/client';

/**
 * Unit Tests for Data
 */
describe('Data', () => {
  afterEach(async () => {
    try {
      await prisma.data.deleteMany({
        where: {
          dataTypeName: 'test'
        }
      });
    } catch (error) {}
    try {
      await prisma.dataType.delete({
        where: {
          name: 'test'
        }
      });
    } catch (error) {}
    try {
      await prisma.node.delete({
        where: {
          name: 'test'
        }
      });
    } catch (error) {}
  });

  afterAll(async () => {
    try {
      await prisma.run.deleteMany({
        where: {
          time: 1
        }
      });
    } catch (error) {}
  });

  test('Get All Data by DataType Name works w valid data', async () => {
    const expected = [];

    await NodeService.upsertNode('test');
    await DataTypeService.upsertDataType('test', 'joe mama', 'test');
    const result = await DataService.getDataByDataTypeName('test');

    // Use toEqual to compare parsedResult with the expected array
    expect(result).toEqual(expected);
  });

  test('Get All Data by DataType Name throws w invalid data', async () => {
    //throws w no data
    await expect(() => DataService.getDataByDataTypeName('test')).rejects.toThrowError('dataType with id test not found');
  });

  test('Add Data Succeeds', async () => {
    const serverData: ServerData = {
      name: 'test',
      value: 0,
      units: 'lbs'
    };

    await NodeService.upsertNode('test');
    await DataTypeService.upsertDataType('test', 'joe mama', 'test');
    const run = await RunService.createRun(1);

    const result = await DataService.addData(serverData, 1, 1, run.id);
    const expected: Data = {
      id: result.id,
      dataTypeName: 'test',
      value: 1,
      time: 1,
      runId: run.id
    };

    expect(result).toEqual(expected);
  });

  test('addData throws error when no dataTypeName', async () => {
    const serverData: ServerData = {
      name: 'test',
      value: 0,
      units: 'lbs'
    };
    //throws w no data
    await expect(() => DataService.addData(serverData, 1, 1, 1)).rejects.toThrowError('dataType with id test not found');
  });
});
