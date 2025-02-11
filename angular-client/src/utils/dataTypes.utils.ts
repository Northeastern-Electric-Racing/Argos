import { BehaviorSubject } from 'rxjs';
import { DataType, Node } from './types.utils';

type MappedNode = Omit<Node, 'nodes'> & { nodes: Map<string, MappedNode> };

export const dataTypesToNodes = (dataTypes: DataType[]): Node[] => {
  const nodes = new Map<string, MappedNode>();
  dataTypes.forEach((dataType: DataType) => {
    const split = dataType.name.split('/');
    let parent: MappedNode | undefined;
    for (const name of split) {
      const topicName = (parent?.topicName ?? '') + name + '/';
      const node: MappedNode = { name, topicName, dataType, nodes: new Map<string, MappedNode>() };
      if (nodes.has(topicName)) {
        parent = nodes.get(topicName)!;
      } else if (parent) {
        if (parent.nodes.has(name)) {
          parent = parent.nodes.get(name)!;
        } else {
          parent.nodes.set(name, node);
          parent = node;
        }
      } else {
        nodes.set(topicName, node);
        parent = node;
      }
    }
  });

  return flattenMappedNodes(nodes);
};

export const flattenMappedNodes = (nodes: Map<string, MappedNode>): Node[] => {
  const flattenedNodes: Node[] = [];

  Array.from(nodes.values()).forEach((node) => {
    flattenedNodes.push({
      ...node,
      nodes: new BehaviorSubject(flattenMappedNodes(node.nodes))
    });
  });

  return flattenedNodes;
};

export const getNodeNameFromDataType = (dataType: DataType) => {
  return dataType.name.split('/')[0];
};

export const dataTypeNamePipe = (dataTypeName: string) => {
  const updatedNameArray = dataTypeName.split('/');
  updatedNameArray.shift();
  const updatedName = updatedNameArray.join('-');
  return updatedName;
};
