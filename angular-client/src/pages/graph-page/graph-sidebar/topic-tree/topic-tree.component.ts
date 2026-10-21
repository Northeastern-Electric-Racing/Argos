import {
  ChangeDetectionStrategy,
  Component,
  afterRenderEffect,
  computed,
  input,
  output,
  signal,
  untracked,
  viewChild
} from '@angular/core';
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
 *
 * Expansion lives in mat-tree's own model (keyed by `expansionKey`), and the chevrons read it back
 * with `tree.isExpanded`. The nodes' `expanded` flags are how the filter and the sidebars ask for a
 * branch to open; they're pushed into the model whenever the nodes, the filter or the selection change.
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

  private tree = viewChild.required<MatTree<TopicNode, string>>('tree');

  constructor() {
    // After render: the tree only creates its expansion model once it has connected to its data.
    afterRenderEffect(() => {
      const tree = this.tree();
      const nodes = this.visibleNodes();
      this.selectedNames(); // the sidebars set flags when a preset opens its topics' branches, or on Clear
      untracked(() => this.syncExpansion(tree, nodes));
    });
  }

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

  /** Leaves toggle selection; branches toggle expansion (the tree reports it back through expandedChange). */
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

  /** Opens or closes every branch, rendered or not, to match its `expanded` flag. */
  private syncExpansion(tree: MatTree<TopicNode, string>, nodes: readonly TopicNode[]) {
    for (const node of nodes) {
      if (!this.hasChildren(node)) continue;
      const wanted = !!node.expanded;
      if (tree.isExpanded(node) !== wanted) {
        if (wanted) tree.expand(node);
        else tree.collapse(node);
      }
      this.syncExpansion(tree, node.children ?? []);
    }
  }
}
