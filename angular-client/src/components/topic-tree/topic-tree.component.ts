import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type TuiHandler } from '@taiga-ui/cdk';
import { TuiInput } from '@taiga-ui/core';
import { TuiTree } from '@taiga-ui/kit';
import TypographyComponent from 'src/components/typography/typography.component';
import { filterTreeNodes, TreeNode, TreeNodeData } from 'src/utils/tree.utils';

type TopicNode = TreeNode<TreeNodeData>;

/**
 * The graph sidebar's topic tree: Taiga's tree for nesting and expansion, plus the search box and
 * click-to-select leaves that Taiga's tree leaves to the app. Clicking a branch row expands it;
 * clicking a leaf toggles its selection.
 */
@Component({
  selector: 'topic-tree',
  templateUrl: './topic-tree.component.html',
  styleUrls: ['./topic-tree.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TuiInput, TuiTree, TypographyComponent]
})
export class TopicTreeComponent {
  nodes = input<TopicNode[]>([]);
  selection = input<TopicNode[] | undefined>(undefined);
  filterPlaceholder = input('Search topics...');

  nodeSelect = output<TopicNode>();
  nodeUnselect = output<TopicNode>();

  filterText = signal('');
  // Bumped when a node's `expanded` flag changes, since the nodes themselves aren't signals
  private expansionVersion = signal(0);

  visibleNodes = computed(() => filterTreeNodes(this.nodes(), this.filterText()));

  /** Expanded state for Taiga's tree controller: every branch while searching, else each node's own flag */
  expansion = computed(() => {
    this.expansionVersion();
    const filtering = this.filterText().trim().length > 0;
    const map = new Map<TopicNode, boolean>();
    const visit = (nodes: TopicNode[]) =>
      nodes.forEach((node) => {
        if (node.children?.length) {
          map.set(node, filtering || !!node.expanded);
          visit(node.children);
        }
      });
    visit(this.visibleNodes());
    return map;
  });

  private selectedNames = computed(
    () => new Set((this.selection() ?? []).map((node) => node.data?.dataType.name).filter(Boolean))
  );

  readonly childrenHandler: TuiHandler<TopicNode, readonly TopicNode[]> = (node) => node.children ?? [];

  isLeaf(node: TopicNode): boolean {
    return !node.children?.length;
  }

  isSelected(node: TopicNode): boolean {
    return this.isLeaf(node) && this.selectedNames().has(node.data?.dataType.name);
  }

  /** Taiga's chevron toggled a branch: keep the node's own flag in step */
  onToggled(node: TopicNode): void {
    node.expanded = !node.expanded;
  }

  onRowClick(node: TopicNode): void {
    if (!this.isLeaf(node)) {
      node.expanded = !this.expansion().get(node);
      this.expansionVersion.update((v) => v + 1);
    } else if (node.selectable) {
      if (this.isSelected(node)) this.nodeUnselect.emit(node);
      else this.nodeSelect.emit(node);
    }
  }
}
