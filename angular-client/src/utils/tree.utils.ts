import { Injector, Signal, runInInjectionContext, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import Storage from 'src/services/storage.service';
import { decimalPipe } from 'src/utils/pipes.utils';
import { DataValue } from 'src/utils/socket.utils';
import { DataType, Node } from 'src/utils/types.utils';

export interface TreeNodeData extends Node {
  displayValue: Signal<string>;
}

/** One topic-tree element for nz-tree-view; `data` carries the tree node and its live value. */
export interface TopicTreeNode {
  title: string;
  key: string;
  data: TreeNodeData;
  children: TopicTreeNode[];
  isLeaf: boolean;
  selectable: boolean;
}

// Shared sentinel for non-leaf nodes whose displayValue is never read.
const EMPTY_DISPLAY: Signal<string> = signal('');

/** Builds topic tree nodes from Nodes; leaf signals cleanup via the injector's DestroyRef. */
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
 * its live `displayValue`.
 */
export function filterSelectedNodes(flatNodes: TopicTreeNode[], selectedDataTypes: DataType[]): TopicTreeNode[] {
  if (selectedDataTypes.length === 0) return [];
  const selectedNames = new Set(selectedDataTypes.map((dt) => dt.name));
  return flatNodes.filter((n) => n.data?.dataType && selectedNames.has(n.data.dataType.name));
}

/**
 * Branches that contain a selected leaf (by dataType name), so the tree can expand them.
 * Only leaves count as selected: branches aren't selectable.
 */
export function findSelectedAncestors(treeNodes: TopicTreeNode[], selectedNames: ReadonlySet<string>): TopicTreeNode[] {
  const ancestors: TopicTreeNode[] = [];
  const walk = (node: TopicTreeNode): boolean => {
    if (node.isLeaf) return selectedNames.has(node.data.dataType?.name);
    let containsSelected = false;
    for (const child of node.children) {
      if (walk(child)) containsSelected = true;
    }
    if (containsSelected) ancestors.push(node);
    return containsSelected;
  };
  if (selectedNames.size) treeNodes.forEach(walk);
  return ancestors;
}

/**
 * Filters the tree by a case-insensitive title match. A matching node keeps all its children;
 * a branch with matching descendants keeps only those, and is returned in `expand` so its
 * matches show. Leaves keep their identity, so their rows and live values aren't rebuilt.
 */
export function filterTopicTree(
  treeNodes: TopicTreeNode[],
  query: string
): { nodes: TopicTreeNode[]; expand: TopicTreeNode[] } {
  const q = query.trim().toLowerCase();
  if (!q) return { nodes: treeNodes, expand: [] };
  const expand: TopicTreeNode[] = [];
  const walk = (nodes: TopicTreeNode[]): TopicTreeNode[] =>
    nodes.flatMap((node) => {
      if (node.title.toLowerCase().includes(q)) return [node];
      const children = walk(node.children);
      if (!children.length) return [];
      const copy = { ...node, children };
      expand.push(copy);
      return [copy];
    });
  return { nodes: walk(treeNodes), expand };
}
