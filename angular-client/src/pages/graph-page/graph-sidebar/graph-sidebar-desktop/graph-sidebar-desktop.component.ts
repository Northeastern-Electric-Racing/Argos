import { Component, OnInit, OnDestroy, input } from '@angular/core';
import { DataType, Node, NodeWithVisibilityToggle } from 'src/utils/types.utils';
import { FormControl, FormGroup } from '@angular/forms';
import { debounceTime, Observable, of, Subscription } from 'rxjs';
import { dataTypesToNodes } from 'src/utils/dataTypes.utils';
import { dataTypeNamePipe } from 'src/utils/dataTypes.utils';
import { TreeNode } from 'primeng/api';

/**
 * Sidebar component that displays the nodes and their data types.
 * @param nodes The nodes to display.
 * Has animations for when a node is selected to collapse and expand the associated datatypes
 *
 */
@Component({
  selector: 'graph-sidebar-desktop',
  templateUrl: './graph-sidebar-desktop.component.html',
  styleUrls: ['./graph-sidebar-desktop.component.css']
})
export default class GraphSidebarDesktopComponent implements OnInit, OnDestroy {
  dataTypes = input<DataType[]>([]);
  selectDataType = input.required<(dataType: DataType) => void>();
  nodes: Node[] = [];
  nodesWithVisibilityToggle!: Observable<NodeWithVisibilityToggle[]>;

  filterForm: FormGroup = new FormGroup({
    searchFilter: new FormControl<string>('')
  });
  filterFormSubsription!: Subscription;
  searchFilter: string = '';

  treeNodes: TreeNode<Node>[] = [];
  selectedNode?: TreeNode<Node>;
  treeInitialized = false;

  /**
   * Initializes the nodes with the visibility toggle.
   */
  ngOnInit(): void {
    this.nodes = dataTypesToNodes(this.dataTypes());

    this.nodesWithVisibilityToggle = of(
      this.nodes.map((node: Node) => {
        return {
          ...node,
          subnodesVisible: false
        };
      })
    );

    // Callback to update search regex (debounced at 300 ms)
    this.filterFormSubsription = this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe((changes) => {
      this.searchFilter = changes.searchFilter;
    });

    const mapToTreeNode = (node: Node): TreeNode => ({
      label: node.name,
      data: node,
      key: node.topicName,
      children: node.nodes.value.map(mapToTreeNode)
    });

    this.treeNodes = this.nodes.map(mapToTreeNode);
  }

  ngOnDestroy(): void {
    this.filterFormSubsription.unsubscribe();
  }

  transformDataTypeName(dataTypeName: string) {
    return dataTypeNamePipe(dataTypeName);
  }

  nodeSelect() {
    if (this.selectedNode?.data) {
      if (this.selectedNode.data.nodes.value.length === 0) {
        this.selectDataType()(this.selectedNode.data.dataType);
      } else {
        this.selectedNode.expanded = !this.selectedNode.expanded;
        this.selectedNode = undefined;
        this.treeNodes = [...this.treeNodes];
      }
    }
  }
}
