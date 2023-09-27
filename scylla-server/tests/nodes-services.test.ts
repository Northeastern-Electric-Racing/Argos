import { describe, test, expect } from 'vitest';
import { getAllNodes } from '../src/services/nodes.services';

describe('Node', () => {
  test('Get All Nodes Works', async () => {
    const expected = [];
    const result = await getAllNodes();

    // Parse result to a JavaScript object from the JSON string
    const parsedResult = JSON.parse(result);

    // Use toEqual to compare parsedResult with the expected array
    expect(parsedResult).toEqual(expected);
  });
});
