import { describe, test, expect, afterEach } from 'vitest';
import NodeService from '../src/services/nodes.services';
import prisma from '../src/prisma/prisma-client';

describe('Node', () => {
  //cleaning up
  afterEach(async () => {
    try {
      await prisma.node.delete({
        where: {
          name: 'test'
        }
      });
    } catch (err) {}
  });

  /**
   * unit test for upsert node
   * testing creating node if doesn't exist
   */
  test('Upsert Node Creates', async () => {
    const expected = [{ name: 'test' }];
    await NodeService.upsertNode('test');
    const result = await NodeService.getAllNodes();

    // Use toEqual to compare parsedResult with the expected array
    expect(result).toEqual(expected);
  });

  test('Get All Nodes Works', async () => {
    const expected = [];
    const result = await NodeService.getAllNodes();

    // Use toEqual to compare parsedResult with the expected array
    expect(result).toEqual(expected);
  });

  /**
   * unit test for upsert node
   * testing does nothing if node does exist
   */
  test('Upsert Node Does Nothing', async () => {
    const expected = [{ name: 'test' }];
    await NodeService.upsertNode('test');
    await NodeService.upsertNode('test');
    const result = await NodeService.getAllNodes();

    // Use toEqual to compare result with the expected array
    expect(result).toEqual(expected);
  });
});
