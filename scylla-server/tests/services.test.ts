import prisma from '../src/prisma/prisma-client';
import { describe, test, expect } from 'vitest';

/**
 * Tests for CRUD service functions
 */

/**
 * basic ahh unit test for get all systems
 */
describe('CRUD Systems', () => {
  test('Get All Systems Works', async () => {
    const allSystems = await prisma.system.findMany();
    expect(allSystems).toStrictEqual([]);
  });
});
