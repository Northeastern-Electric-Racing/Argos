import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, input } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TreeNode, PrimeTemplate } from 'primeng/api';
import { TreeNodeSelectEvent, TreeNodeUnSelectEvent, Tree } from 'primeng/tree';
import { Sidebar } from 'primeng/sidebar';
import Storage from 'src/services/storage.service';
import { decimalPipe } from 'src/utils/pipes.utils';
import { dataTypesToNodes } from 'src/utils/dataTypes.utils';
import { DataType, Node } from 'src/utils/types.utils';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { ButtonComponent } from '../../../../components/argos-button/argos-button.component';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'graph-sidebar-mobile',
  templateUrl: './graph-sidebar-mobile.component.html',
  styleUrls: ['./graph-sidebar-mobile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, Sidebar, PrimeTemplate, Tree, ButtonComponent, TypographyComponent]
})
export default class GraphSidebarMobileComponent implements OnInit, OnDestroy {
  dataTypes = input.required<DataType[]>();

  private topicSelectionService = inject(TopicSelectionService);
  private storage = inject(Storage);

  sidebarVisible = false;
  nodes: Node[] = [];
  treeNodes: TreeNode<Node>[] = [];
  selectedNodes?: TreeNode<Node>[];

  private storageSubscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.nodes = dataTypesToNodes(this.dataTypes());

    const mapToTreeNode = (node: Node): TreeNode => {
      const displayValue = new BehaviorSubject<string>('N/A');
      const isLeaf = node.nodes.value.length === 0;
      if (isLeaf) {
        // topicName has a trailing slash from dataTypesToNodes — strip it for storage lookup
        this.storageSubscriptions.push(
          this.storage.get(node.topicName.slice(0, -1)).subscribe((value) => {
            displayValue.next(decimalPipe(value.values[0], 3).toFixed(3) + value.unit);
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

    this.treeNodes = this.nodes.map(mapToTreeNode);

    // Sync existing selections
    const findSelectedNodes = (nodes: TreeNode<Node>[]): TreeNode<Node>[] => {
      const selected: TreeNode<Node>[] = [];
      const containsSelected = new Map<TreeNode<Node>, boolean>();

      const search = (nodes: TreeNode<Node>[], parents: TreeNode<Node>[] = []): void => {
        for (const node of nodes) {
          if (node.selectable && node.data?.dataType && this.topicSelectionService.isSelected(node.data.dataType)) {
            selected.push(node);
            parents.forEach((p) => containsSelected.set(p, true));
          }
          if (node.children?.length) {
            search(node.children as TreeNode<Node>[], [...parents, node]);
          }
        }
      };

      search(nodes);
      containsSelected.forEach((_, node) => (node.expanded = true));
      return selected;
    };

    this.selectedNodes = findSelectedNodes(this.treeNodes);
  }

  ngOnDestroy(): void {
    this.storageSubscriptions.forEach((sub) => sub.unsubscribe());
  }

  toggleSidebar = () => {
    this.sidebarVisible = !this.sidebarVisible;
  };

  clearSelections = () => {
    this.treeNodes.forEach((n) => (n.expanded = false));
    this.topicSelectionService.clearSelection();
    this.selectedNodes = undefined;
  };

  nodeSelect(event: TreeNodeSelectEvent) {
    const dt = event.node.data?.dataType;
    if (dt) {
      this.topicSelectionService.addDataType(dt);
    }
  }

  onRowClick(evt: MouseEvent, node: TreeNode) {
    if (node.children?.length !== 0) {
      evt.preventDefault();
      evt.stopPropagation();
      node.expanded = !node.expanded;
    }
  }

  onNodeUnselect(event: TreeNodeUnSelectEvent) {
    const dt = event.node.data?.dataType;
    if (dt) {
      this.topicSelectionService.removeDataType(dt);
    }
  }

}
