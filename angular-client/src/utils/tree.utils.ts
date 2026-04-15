import { Injector, Signal, runInInjectionContext, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TreeNode } from 'primeng/api';
import { map } from 'rxjs';
import Storage from 'src/services/storage.service';
import { decimalPipe } from 'src/utils/pipes.utils';
import { Node } from 'src/utils/types.utils';
import { TopicSelectionService } from 'src/services/topic-selection.service';

export interface TreeNodeData extends Node {
  displayValue: Signal<string>;
}

/** Builds TreeNodes from Nodes; leaf signals cleanup via the injector's DestroyRef. */
export function mapNodesToTreeNodes(
  nodes: Node[],
  storage: Storage,
  injector: Injector,
  precision = 3
): TreeNode<TreeNodeData>[] {
  const mapToTreeNode = (node: Node): TreeNode<TreeNodeData> => {
    const isLeaf = node.nodes.value.length === 0;
    // topicName has a trailing slash from dataTypesToNodes — strip it for storage lookup
    const displayValue: Signal<string> = isLeaf
      ? runInInjectionContext(injector, () =>
          toSignal(
            storage.get(node.topicName.slice(0, -1)).pipe(
              map((value) => {
                const num = value?.values?.length ? decimalPipe(value.values[0], precision) : NaN;
                return Number.isNaN(num) ? 'N/A' : num.toFixed(precision) + (value.unit ?? '');
              })
            ),
            { initialValue: 'N/A' }
          )
        )
      : signal('');
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

/** Finds already-selected nodes and expands their parents. */
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
