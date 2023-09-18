import prisma from '../src/prisma/prisma-client';
import { describe, test, expect } from 'vitest';
import { getAllDataTypes } from '../src/services/dataTypes.services';

/**
 * Tests for CRUD service functions
 */

/**
 * unit tests for get all dataTypes
 * (may or may not be hijacking dylan's tests D:, thank you Dylan.)
 */

describe('Data Type', () => {
  test('Get All Data Types Works', async () => {
    const expected = [
      { id: 1, dataType: 'string' },
      { id: 2, dataType: 'int' }
    ];
    const prismaMock = require('../prisma/prisma-client');
    prismaMock.dataType.findMany.mockResolvedValue(expected);

    const result = await getAllDataTypes;

    expect(prismaMock.dataType.findMany).toHaveBeenCalled();
    expect(result).toBe(JSON.stringify(expected));
  });
});
