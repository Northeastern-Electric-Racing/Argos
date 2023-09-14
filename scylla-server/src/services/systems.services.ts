import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/message-maps.utils';

// CRUD operation to get all systems with ResponseFunction type

export const getAllSystems: ResponseFunction = async (data: JSON) => {
  try {
    const data = await prisma.system.findMany();
    // was getting type errors trying to return just data
    // so added JSON parse and stringify to make it conform to JSON
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    throw new Error('Error getting all systems');
  }
};
