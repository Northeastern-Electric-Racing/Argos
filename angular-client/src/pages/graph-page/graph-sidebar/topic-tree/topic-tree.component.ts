import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatFormField, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTree, MatTreeNode, MatTreeNodeDef, MatTreeNodePadding } from '@angular/material/tree';
import TypographyComponent from 'src/components/typography/typography.component';
import { filterTreeNodes, TreeNode, TreeNodeData } from 'src/utils/tree.utils';

type TopicNode = TreeNode<TreeNodeData>;

/**
 * The graph sidebar's topic tree: a filter box over a flat mat-tree. Branches expand and collapse
 * on click (or arrow keys); leaves toggle their topic's selection. Selection lives in
 * TopicSelectionService, so the tree only reads `selectedNames` and reports clicks.
 */
@Component({
  selector: 'topic-tree',
  templateUrl: './topic-tree.component.html',
  styleUrl: './topic-tree.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatTree,
    MatTreeNode,
    MatTreeNodeDef,
    MatTreeNodePadding,
    MatFormField,
    MatPrefix,
    MatInput,
    MatIcon,
    TypographyComponent
  ]
})
export class TopicTreeComponent {
  nodes = input.required<TopicNode[]>();
  /** Names of the selected topics (DataType names). */
  selectedNames = input<ReadonlySet<string>>(new Set());
  filterPlaceholder = input('Search topics');
  height = input('80vh');

  nodeSelect = output<TopicNode>();
  nodeUnselect = output<TopicNode>();

  filter = signal('');
  visibleNodes = computed(() => filterTreeNodes(this.nodes(), this.filter()));

  readonly childrenAccessor = (node: TopicNode) => node.children ?? [];
  readonly expansionKey = (node: TopicNode): string => node.key ?? node.label ?? '';
  readonly trackBy = (_index: number, node: TopicNode) => node.key ?? node.label;

  hasChildren(node: TopicNode): boolean {
    return (node.children?.length ?? 0) > 0;
  }

  isSelected(node: TopicNode): boolean {
    const name = node.data?.dataType?.name;
    return !!node.selectable && !!name && this.selectedNames().has(name);
  }

  onFilterInput(event: Event) {
    this.filter.set((event.target as HTMLInputElement).value);
  }

  /** Leaves toggle selection; branches toggle expansion (tracked on the node for the sidebars). */
  activate(node: TopicNode, tree: MatTree<TopicNode, string>) {
    if (this.hasChildren(node)) {
      tree.toggle(node);
      return;
    }
    if (!node.selectable) return;
    if (this.isSelected(node)) {
      this.nodeUnselect.emit(node);
    } else {
      this.nodeSelect.emit(node);
    }
  }
}
