import { Node } from '@prisma/client';
import prisma from '../prisma/prisma-client';
import { ResponseFunction } from '../utils/response-function';

export default class NodeService {
  /**
   * CRUD operation to get all systems with ResponseFunction type
   * @returns Promise<string> contianing all the nodes in the db
   */
  static getAllNodes: ResponseFunction<Node[]> = async () => {
    const data = await prisma.node.findMany();
    return data;
  };

  /**
   * CRUD opertation that creates node if it doesn't exist, otherwise does nothing.
   * Currently designated private so not hooked up to server.
   * @param nodeName name of the system as string
   * @returns the created node
   */
  static upsertNode = async (nodeName: string): Promise<Node> => {
    return await prisma.node.upsert({
      where: {
        name: nodeName
      },
      update: {},
      create: {
        name: nodeName
      }
    });
  };
}
