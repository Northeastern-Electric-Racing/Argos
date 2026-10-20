import { Injector, Signal, runInInjectionContext, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NzTreeNodeOptions } from 'ng-zorro-antd/core/tree';
import { map } from 'rxjs';
import Storage from 'src/services/storage.service';
import { decimalPipe } from 'src/utils/pipes.utils';
import { DataValue } from 'src/utils/socket.utils';
import { DataType, Node } from 'src/utils/types.utils';
import { TopicSelectionService } from 'src/services/topic-selection.service';

export interface TreeNodeData extends Node {
  displayValue: Signal<string>;
}

/** An ng-zorro tree node for one topic-tree element; `data` carries the tree node and its live value. */
export interface TopicTreeNode extends NzTreeNodeOptions {
  title: string;
  key: string;
  data: TreeNodeData;
  children: TopicTreeNode[];
  isLeaf: boolean;
  selectable: boolean;
}

// Shared sentinel for non-leaf nodes whose displayValue is never read.
const EMPTY_DISPLAY: Signal<string> = signal('');

/** Builds ng-zorro tree nodes from Nodes; leaf signals cleanup via the injector's DestroyRef. */
export function mapNodesToTreeNodes(nodes: Node[], storage: Storage, injector: Injector, precision = 3): TopicTreeNode[] {
  const formatValue = (value: DataValue): string => {
    const num = value?.values?.length ? decimalPipe(value.values[0], precision) : NaN;
    return Number.isNaN(num) ? 'N/A' : num.toFixed(precision) + (value.unit ?? '');
  };

  const mapToTreeNode = (node: Node): TopicTreeNode => {
    const isLeaf = node.nodes.value.length === 0;
    const displayValue = isLeaf
      ? toSignal(storage.get(node.dataType.name).pipe(map(formatValue)), { initialValue: 'N/A' })
      : EMPTY_DISPLAY;
    return {
      title: node.name,
      data: { ...node, displayValue },
      key: node.topicName,
      children: node.nodes.value.map(mapToTreeNode),
      isLeaf,
      selectable: isLeaf
    };
  };

  return runInInjectionContext(injector, () => nodes.map(mapToTreeNode));
}

/**
 * Compacts a slash-separated path so it fits under `maxLength`.
 * Returns the full path when it already fits. Otherwise keeps the first
 * segment and as much of the tail as fits, joined by `...`. Falls back to
 * `first...lastSegment` when even that exceeds `maxLength`.
 */
export function compactTopicLabel(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  const segments = name.split('/');
  if (segments.length <= 2) return name;
  const [first] = segments;
  for (let tailStart = 1; tailStart < segments.length; tailStart++) {
    const tail = segments.slice(tailStart).join('/');
    const candidate = `${first}...${tail}`;
    if (candidate.length <= maxLength) return candidate;
  }
  return `${first}...${segments[segments.length - 1]}`;
}

/**
 * Flattens a tree of topic tree nodes to a leaf-only list. Each leaf's label is the
 * full `dataType.name` when it fits under `maxLabelLength`, otherwise compacted
 * to `<firstSegment>...<tail>` keeping as much of the tail as fits.
 * Preserves `data` so each leaf's `displayValue` signal stays wired to live values.
 */
export function flattenTreeNodes(treeNodes: TopicTreeNode[], maxLabelLength = 30): TopicTreeNode[] {
  const leaves: TopicTreeNode[] = [];

  const collect = (nodes: TopicTreeNode[]): void => {
    for (const node of nodes) {
      if (node.children?.length) {
        collect(node.children);
      } else if (node.selectable && node.data?.dataType) {
        leaves.push({
          ...node,
          title: compactTopicLabel(node.data.dataType.name, maxLabelLength),
          children: [],
          isLeaf: true,
          selectable: true
        });
      }
    }
  };

  collect(treeNodes);
  return leaves.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Filters a flat list of leaf tree nodes to only those whose dataType is in
 * `selectedDataTypes`. Preserves the original node references, so each leaf keeps
 * its live `displayValue` and expanded/selected state.
 */
export function filterSelectedNodes(flatNodes: TopicTreeNode[], selectedDataTypes: DataType[]): TopicTreeNode[] {
  if (selectedDataTypes.length === 0) return [];
  const selectedNames = new Set(selectedDataTypes.map((dt) => dt.name));
  return flatNodes.filter((n) => n.data?.dataType && selectedNames.has(n.data.dataType.name));
}

/** Finds already-selected nodes and expands their parents. */
export function findSelectedTreeNodes(treeNodes: TopicTreeNode[], selectionService: TopicSelectionService): TopicTreeNode[] {
  const selected: TopicTreeNode[] = [];
  const containsSelected = new Map<TopicTreeNode, boolean>();

  const search = (nodes: TopicTreeNode[], parents: TopicTreeNode[] = []): void => {
    for (const node of nodes) {
      if (node.selectable && node.data?.dataType && selectionService.isSelected(node.data.dataType)) {
        selected.push(node);
        parents.forEach((p) => containsSelected.set(p, true));
      }
      if (node.children?.length) {
        search(node.children, [...parents, node]);
      }
    }
  };

  search(treeNodes);
  containsSelected.forEach((_, node) => (node.expanded = true));
  return selected;
}

/** Keys of every expanded node, for ng-zorro's `nzExpandedKeys`. */
export function collectExpandedKeys(treeNodes: TopicTreeNode[]): string[] {
  const keys: string[] = [];
  const walk = (nodes: TopicTreeNode[]): void => {
    for (const node of nodes) {
      if (node.expanded) keys.push(node.key);
      if (node.children.length) walk(node.children);
    }
  };
  walk(treeNodes);
  return keys;
}
