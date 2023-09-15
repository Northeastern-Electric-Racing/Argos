import prisma from '../src/prisma/prisma-client';
import { describe, test, expect } from 'vitest';

/**
 * Tests for CRUD service functions
 */

/**
 * unit tests for get all dataTypes
 * (may or may not be hijacking dylan's tests D:, thank you Dylan.)
 */

describe('Data Type', () => {
  test('Get All Data Types Works', async () => {
    const allDataTypes = await prisma.dataType.findMany();
    expect(allDataTypes).toStrictEqual([]);
  });
});
