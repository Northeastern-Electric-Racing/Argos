import prisma from '../src/prisma/prisma-client';

describe('Data Type', () => {
  test('Get All Data Types Works', async () => {
    const allDataTypes = await prisma.dataType.findMany();
    expect(allDataTypes).toStrictEqual([]);
  });
});
