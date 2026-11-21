import { decimalPipe } from 'src/utils/pipes.utils';
import { DataValue } from 'src/utils/socket.utils';
import { DataType, Node } from 'src/utils/types.utils';
import { TopicSelectionService } from 'src/services/topic-selection.service';

/** A topic-tree node as rendered by the graph sidebar's Angular Aria tree. */
export interface TreeNode<T = unknown> {
  label?: string;
  data?: T;
  /** Unique, stable id (the topic name); used as the Aria tree item value. */
  key?: string;
  children?: TreeNode<T>[];
  selectable?: boolean;
  expanded?: boolean;
}

/** A tree node's data. Its live value is not part of it: the leaf's row reads that while it is rendered (topic-live-value). */
export type TreeNodeData = Node;

/** Formats a topic's value for a tree row: its first value to `precision` places plus its unit, or N/A. */
export function formatLiveValue(value: DataValue | undefined, precision = 3): string {
  const num = value?.values?.length ? decimalPipe(value.values[0], precision) : NaN;
  return Number.isNaN(num) ? 'N/A' : num.toFixed(precision) + (value?.unit ?? '');
}

/** Builds TreeNodes from Nodes. Subscribes to nothing: each leaf row subscribes to its topic only while it is rendered. */
export function mapNodesToTreeNodes(nodes: Node[]): TreeNode<TreeNodeData>[] {
  const mapToTreeNode = (node: Node): TreeNode<TreeNodeData> => {
    const isLeaf = node.nodes.value.length === 0;
    return {
      label: node.name,
      data: node,
      key: node.topicName,
      children: node.nodes.value.map(mapToTreeNode),
      selectable: isLeaf,
      expanded: false
    };
  };

  return nodes.map(mapToTreeNode);
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
 * Flattens a tree of TreeNodes to a leaf-only list. Each leaf's label is the
 * full `dataType.name` when it fits under `maxLabelLength`, otherwise compacted
 * to `<firstSegment>...<tail>` keeping as much of the tail as fits.
 * Preserves `data` and `key`, so a flat leaf is the same topic as its tree original.
 */
export function flattenTreeNodes(treeNodes: TreeNode<TreeNodeData>[], maxLabelLength = 30): TreeNode<TreeNodeData>[] {
  const leaves: TreeNode<TreeNodeData>[] = [];

  const collect = (nodes: TreeNode<TreeNodeData>[]): void => {
    for (const node of nodes) {
      if (node.children?.length) {
        collect(node.children as TreeNode<TreeNodeData>[]);
      } else if (node.selectable && node.data?.dataType) {
        leaves.push({
          ...node,
          label: compactTopicLabel(node.data.dataType.name, maxLabelLength),
          children: [],
          selectable: true
        });
      }
    }
  };

  collect(treeNodes);
  return leaves.sort((a, b) => (a.label ?? '').localeCompare(b.label ?? ''));
}

/**
 * Filters a flat list of leaf TreeNodes to only those whose dataType is in
 * `selectedDataTypes`. Preserves the original node references so keys and
 * references stay stable.
 */
export function filterSelectedNodes(
  flatNodes: TreeNode<TreeNodeData>[],
  selectedDataTypes: DataType[]
): TreeNode<TreeNodeData>[] {
  if (selectedDataTypes.length === 0) return [];
  const selectedNames = new Set(selectedDataTypes.map((dt) => dt.name));
  return flatNodes.filter((n) => n.data?.dataType && selectedNames.has(n.data.dataType.name));
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
