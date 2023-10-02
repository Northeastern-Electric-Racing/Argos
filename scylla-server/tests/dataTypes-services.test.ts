import { describe, test, expect, beforeEach } from 'vitest';
import { getAllDataTypes, upsertDataType } from '../src/services/dataTypes.services';
import prisma from '../src/prisma/prisma-client';

describe('Data Type', () => {
  beforeEach(async () => {
    await prisma.dataType.deleteMany();
    await prisma.node.deleteMany();
  });

  test('Get All Data Types Works', async () => {
    const expected = [];
    const result = await getAllDataTypes();

    // Parse result to a JavaScript object from the JSON string
    const parsedResult = JSON.parse(result);

    // Use toEqual to compare parsedResult with the expected array
    expect(parsedResult).toEqual(expected);
  });

  test('Upsert DataType Creates', async () => {
    const dataTypeName = 'testDataTypeCreation';
    const unit = 'testUnitCreation';
    const nodeName = 'testNodeCreation';

    // Ensure the node's existence before using upsertDataType
    await prisma.node.create({
      data: {
        name: nodeName
      }
    });

    // Use the function
    await upsertDataType(dataTypeName, unit, nodeName);

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
