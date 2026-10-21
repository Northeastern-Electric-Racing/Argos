import { ChangeDetectionStrategy, Component, afterRenderEffect, computed, inject, input, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTreeViewComponent, NzTreeViewModule } from 'ng-zorro-antd/tree-view';
import TypographyComponent from 'src/components/typography/typography.component';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { TopicTreeNode, filterTopicTree, findSelectedAncestors } from 'src/utils/tree.utils';

/**
 * The graph sidebar's topic tree: ng-zorro's CDK-based nz-tree-view, so it has the WAI-ARIA tree
 * roles and arrow-key navigation. Leaves toggle their topic; branches open and close.
 * Parents of selected topics open when the nodes change or a topic is newly selected.
 */
@Component({
  selector: 'topic-tree',
  templateUrl: './topic-tree.component.html',
  styleUrls: ['./topic-tree.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzTreeViewModule, NzIconModule, TypographyComponent]
})
export default class TopicTreeComponent {
  private topicSelection = inject(TopicSelectionService);
  private tree = viewChild<NzTreeViewComponent<TopicTreeNode>>(NzTreeViewComponent);

  nodes = input.required<TopicTreeNode[]>();
  searchValue = input('');

  private selectedDataTypes = toSignal(this.topicSelection.getSelectedDataTypes(), { initialValue: [] });
  selectedNames = computed(() => new Set(this.selectedDataTypes().map((dt) => dt.name)));
  private filtered = computed(() => filterTopicTree(this.nodes(), this.searchValue()));
  data = computed(() => this.filtered().nodes);

  readonly childrenAccessor = (node: TopicTreeNode) => node.children;

  constructor() {
    // After render, because the CDK tree creates its expansion model once it has data.
    let lastNodes: TopicTreeNode[] | undefined;
    let lastTree: NzTreeViewComponent<TopicTreeNode> | undefined;
    let lastNames = new Set<string>();
    afterRenderEffect(() => {
      const tree = this.tree();
      const nodes = this.nodes();
      const names = this.selectedNames();
      if (!tree) return;
      const fresh = nodes !== lastNodes || tree !== lastTree;
      const added = fresh ? names : new Set([...names].filter((n) => !lastNames.has(n)));
      [lastNodes, lastTree, lastNames] = [nodes, tree, names];
      findSelectedAncestors(nodes, added).forEach((n) => tree.expand(n));
    });
    // Searching opens the branches (filtered copies) that hold matches.
    afterRenderEffect(() => {
      const tree = this.tree();
      this.filtered().expand.forEach((n) => tree?.expand(n));
    });
  }

  isSelected(node: TopicTreeNode): boolean {
    return node.isLeaf && this.selectedNames().has(node.data.dataType?.name);
  }

  /** Click or Enter/Space: a leaf toggles its topic, a branch opens or closes. */
  activate(node: TopicTreeNode) {
    if (node.isLeaf) {
      this.topicSelection.toggleDataType(node.data.dataType);
    } else {
      this.tree()?.toggle(node);
    }
  }

  collapseAll() {
    this.tree()?.collapseAll();
  }
}
