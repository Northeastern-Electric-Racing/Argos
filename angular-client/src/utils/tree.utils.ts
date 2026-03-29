import { BehaviorSubject, Subscription } from 'rxjs';
import { TreeNode } from 'primeng/api';
import Storage from 'src/services/storage.service';
import { decimalPipe } from 'src/utils/pipes.utils';
import { Node } from 'src/utils/types.utils';
import { TopicSelectionService } from 'src/services/topic-selection.service';

export interface TreeNodeData extends Node {
  displayValue: BehaviorSubject<string>;
}

/**
 * Recursively maps Node[] to PrimeNG TreeNode[], subscribing leaf nodes
 * to Storage for live value display.
 *
 * @returns The tree nodes. Caller must unsubscribe via the subscriptions array.
 */
export function mapNodesToTreeNodes(
  nodes: Node[],
  storage: Storage,
  subscriptions: Subscription[],
  precision = 3
): TreeNode<TreeNodeData>[] {
  const mapToTreeNode = (node: Node): TreeNode<TreeNodeData> => {
    const displayValue = new BehaviorSubject<string>('N/A');
    const isLeaf = node.nodes.value.length === 0;
    if (isLeaf) {
      // topicName has a trailing slash from dataTypesToNodes — strip it for storage lookup
      subscriptions.push(
        storage.get(node.topicName.slice(0, -1)).subscribe((value) => {
          displayValue.next(decimalPipe(value.values[0], precision).toFixed(precision) + value.unit);
        })
      );
    }
    return {
      label: node.name,
      data: { ...node, displayValue },
      key: node.topicName,
      children: node.nodes.value.map(mapToTreeNode),
      selectable: isLeaf
    };
  };
  return nodes.map(mapToTreeNode);
}

/**
 * Finds already-selected nodes in a tree and expands their parents.
 */
export function findSelectedTreeNodes(
  treeNodes: TreeNode<TreeNodeData>[],
  selectionService: TopicSelectionService
): TreeNode<TreeNodeData>[] {
  const selected: TreeNode<TreeNodeData>[] = [];
  const containsSelected = new Map<TreeNode<TreeNodeData>, boolean>();

  const search = (nodes: TreeNode<TreeNodeData>[], parents: TreeNode<TreeNodeData>[] = []): void => {
    for (const node of nodes) {
      if (node.selectable && node.data?.dataType && selectionService.isSelected(node.data.dataType)) {
        selected.push(node);
        parents.forEach((p) => containsSelected.set(p, true));
      }
      if (node.children?.length) {
        search(node.children as TreeNode<TreeNodeData>[], [...parents, node]);
      }
    }
  };

  search(treeNodes);
  containsSelected.forEach((_, node) => (node.expanded = true));
  return selected;
}
