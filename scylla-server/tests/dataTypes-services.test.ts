import { describe, test, expect, afterEach } from 'vitest';
import DataTypeService from '../src/services/dataTypes.services';
import prisma from '../src/prisma/prisma-client';
import NodeService from '../src/services/nodes.services';

describe('Data Type', () => {
  afterEach(async () => {
    try {
      await prisma.dataType.delete({
        where: {
          name: 'test'
        }
      });
    } catch (err) {}
    try {
      await prisma.node.delete({
        where: {
          name: 'testNode'
        }
      });
    } catch (err) {}
  });

  test('Get All Data Types Works', async () => {
    const expected = [];
    const result = await DataTypeService.getAllDataTypes();

    expect(result).toEqual(expected);
  });

  test('Upsert DataType Fails with invalid node', async () => {
    const dataTypeName = 'test';
    const unit = 'testUnitCreation';
    const nodeName = 'testNode';

    await expect(async () => DataTypeService.upsertDataType(dataTypeName, unit, nodeName)).rejects.toThrowError(
      'Node with id testNode does not exist'
    );
  });

  test('Upsert DataType Creates', async () => {
    const dataTypeName = 'test';
    const unit = 'testUnitCreation';
    const nodeName = 'testNode';

    // Ensure the node's existence before using upsertDataType
    await NodeService.upsertNode(nodeName);

    // Use the function
    await DataTypeService.upsertDataType(dataTypeName, unit, nodeName);

    const createdDataType = await prisma.dataType.findUnique({
      where: {
        name: dataTypeName
      },
      include: {
        node: true
      }
    });

    // Define the expected result
    const expected = {
      name: dataTypeName,
      unit,
      node: {
        name: nodeName
      }
    };

    // Compare the fetched DataType with the expected result
    expect(createdDataType).toMatchObject(expected);
  });
});
