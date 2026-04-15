import { Component, Injector, OnInit, inject, input } from '@angular/core';
import { TreeNode, PrimeTemplate } from 'primeng/api';
import { TreeNodeSelectEvent, TreeNodeUnSelectEvent, Tree } from 'primeng/tree';
import Storage from 'src/services/storage.service';
import { dataTypesToNodes } from 'src/utils/dataTypes.utils';
import { mapNodesToTreeNodes, findSelectedTreeNodes, TreeNodeData } from 'src/utils/tree.utils';
import { DataType } from 'src/utils/types.utils';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { ButtonComponent } from '../../../../components/argos-button/argos-button.component';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'graph-sidebar-desktop',
  templateUrl: './graph-sidebar-desktop.component.html',
  styleUrls: ['./graph-sidebar-desktop.component.css'],
  imports: [ButtonComponent, Tree, PrimeTemplate, TypographyComponent]
})
export default class GraphSidebarDesktopComponent implements OnInit {
  private topicSelectionService = inject(TopicSelectionService);
  private storage = inject(Storage);
  private injector = inject(Injector);

  dataTypes = input<DataType[]>([]);
  treeNodes: TreeNode<TreeNodeData>[] = [];
  selectedNodes?: TreeNode<TreeNodeData>[];

  ngOnInit(): void {
    const nodes = dataTypesToNodes(this.dataTypes());
    this.treeNodes = mapNodesToTreeNodes(nodes, this.storage, this.injector);
    this.selectedNodes = findSelectedTreeNodes(this.treeNodes, this.topicSelectionService);
  }

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
