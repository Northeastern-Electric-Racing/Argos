import { describe, test, expect, afterEach } from 'vitest';
import { getAllNodes, upsertNode } from '../src/services/nodes.services';
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
    await upsertNode('test');
    const result = JSON.parse(await getAllNodes());

    // Use toEqual to compare parsedResult with the expected array
    expect(result).toEqual(expected);
  });

  test('Get All Nodes Works', async () => {
    const expected = [];
    const result = await getAllNodes();

    // Parse result to a JavaScript object from the JSON string
    const parsedResult = JSON.parse(result);

    // Use toEqual to compare parsedResult with the expected array
    expect(parsedResult).toEqual(expected);
  });

  /**
   * unit test for upsert node
   * testing does nothing if node does exist
   */
  test('Upsert Node Does Nothing', async () => {
    const expected = [{ name: 'test' }];
    await upsertNode('test');
    await upsertNode('test');
    const result = JSON.parse(await getAllNodes());

    // Use toEqual to compare result with the expected array
    expect(result).toEqual(expected);
  });
});
