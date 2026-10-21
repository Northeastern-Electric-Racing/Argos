import { NgTemplateOutlet } from '@angular/common';
import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from 'src/components/typography/typography.component';
import { TreeNode, TreeNodeData } from 'src/utils/tree.utils';

type TopicNode = TreeNode<TreeNodeData>;

/** Keeps nodes whose label matches, plus the ancestors of matches (expanded), like PrimeNG's lenient filter. */
function filterNodes(nodes: TopicNode[], term: string): TopicNode[] {
  const result: TopicNode[] = [];
  for (const node of nodes) {
    if ((node.label ?? '').toLowerCase().includes(term)) {
      result.push(node);
    } else if (node.children?.length) {
      const children = filterNodes(node.children, term);
      if (children.length) result.push({ ...node, children, expanded: true });
    }
  }
  return result;
}

function collectLeafKeys(nodes: TopicNode[], into: Set<string>): Set<string> {
  for (const node of nodes) {
    if (node.children?.length) collectLeafKeys(node.children, into);
    else if (node.selectable && node.key) into.add(node.key);
  }
  return into;
}

/**
 * The graph sidebar's topic tree: Angular Aria's multi-select Tree (keyboard navigation,
 * aria-selected/aria-expanded, typeahead) with a filter box and live leaf values on top.
 * Clicking a leaf toggles its selection; clicking a parent toggles it open.
 */
@Component({
  selector: 'topic-tree',
  templateUrl: './topic-tree.component.html',
  styleUrls: ['./topic-tree.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [Tree, TreeItem, TreeItemGroup, NgTemplateOutlet, MatIcon, TypographyComponent]
})
export class TopicTreeComponent {
  nodes = input<TopicNode[]>([]);
  selectedKeys = input<string[]>([]);
  filterPlaceholder = input('Search topics...');
  height = input('80vh');

  nodeSelect = output<string>();
  nodeUnselect = output<string>();

  protected filter = signal('');
  protected visibleNodes = computed(() => {
    const term = this.filter().trim().toLowerCase();
    return term ? filterNodes(this.nodes(), term) : this.nodes();
  });
  private visibleLeafKeys = computed(() => collectLeafKeys(this.visibleNodes(), new Set()));

  /** Diffs the tree's new value against our selection; hidden (filtered-out) leaves never count as unselected. */
  protected onValueChange(keys: string[]): void {
    const next = new Set(keys);
    const prev = new Set(this.selectedKeys());
    const visible = this.visibleLeafKeys();
    for (const key of next) if (!prev.has(key) && visible.has(key)) this.nodeSelect.emit(key);
    for (const key of prev) if (!next.has(key) && visible.has(key)) this.nodeUnselect.emit(key);
  }

  protected onFilterInput(event: Event): void {
    this.filter.set((event.target as HTMLInputElement).value);
  }
}
