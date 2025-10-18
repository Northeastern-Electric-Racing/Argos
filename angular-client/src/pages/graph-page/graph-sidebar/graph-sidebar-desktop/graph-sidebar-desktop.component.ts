import { Component, OnInit, OnDestroy, input, inject } from '@angular/core';
import { DataType, Node } from 'src/utils/types.utils';
import { FormControl, FormGroup } from '@angular/forms';
import { BehaviorSubject, debounceTime, Subscription } from 'rxjs';
import { TreeNode, PrimeTemplate } from 'primeng/api';
import Storage from 'src/services/storage.service';
import { decimalPipe } from 'src/utils/pipes.utils';
import { TreeNodeSelectEvent, TreeNodeUnSelectEvent, Tree } from 'primeng/tree';
import { dataTypeNamePipe, dataTypesToNodes } from 'src/utils/dataTypes.utils';
import { ButtonComponent } from '../../../../components/argos-button/argos-button.component';
import TypographyComponent from 'src/components/typography/typography.component';
import { TopicSelectionService } from 'src/services/topic-selection.service';

/**
 * Sidebar component that displays the nodes and their data types.
 * @param nodes The nodes to display.
 * Has animations for when a node is selected to collapse and expand the associated datatypes
 *
 */
@Component({
  selector: 'graph-sidebar-desktop',
  templateUrl: './graph-sidebar-desktop.component.html',
  styleUrls: ['./graph-sidebar-desktop.component.css'],
  standalone: true,
  imports: [ButtonComponent, Tree, PrimeTemplate, TypographyComponent]
})
export default class GraphSidebarDesktopComponent implements OnInit, OnDestroy {
  private topicSelectionService = inject(TopicSelectionService);
  private storage = inject(Storage);
  dataTypes = input<DataType[]>([]);
  nodes: Node[] = [];

  filterForm: FormGroup = new FormGroup({
    searchFilter: new FormControl<string>('')
  });
  filterFormSubsription!: Subscription;
  searchFilter: string = '';

  treeNodes: TreeNode<Node>[] = [];
  selectedNodes?: TreeNode<Node>[]; // still needed for p-tree binding
  treeInitialized = false;

  // Local list of selected DataTypes
  private selectedDataTypesList: DataType[] = [];

  /**
   * Initializes the nodes with the visibility toggle.
   */
  ngOnInit(): void {
    this.nodes = dataTypesToNodes(this.dataTypes());

    // Callback to update search regex (debounced at 300 ms)
    this.filterFormSubsription = this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe((changes) => {
      this.searchFilter = changes.searchFilter;
    });

    const mapToTreeNode = (node: Node): TreeNode => {
      const displayValue = new BehaviorSubject<string>('N/A');
      this.storage.get(node.topicName.slice(0, -1)).subscribe((value) => {
        displayValue.next(decimalPipe(value.values[0], 3).toFixed(3) + value.unit);
      });
      return {
        label: node.name,
        data: { ...node, displayValue },
        key: node.topicName,
        children: node.nodes.value.map(mapToTreeNode),
        selectable: node.nodes.value.length === 0
      };
    };

    this.treeNodes = this.nodes.map(mapToTreeNode);
    // Helper function to find selected nodes in the tree and expand their parent nodes
    const findSelectedNodes = (nodes: TreeNode<Node>[]): TreeNode<Node>[] => {
      const selected: TreeNode<Node>[] = [];

      // Map to track if a node contains selected children
      const containsSelectedNode = new Map<TreeNode<Node>, boolean>();

      // First pass: find all selected nodes
      const findSelected = (nodes: TreeNode<Node>[], parents: TreeNode<Node>[] = []): void => {
        for (const node of nodes) {
          // Check if this is a leaf node and matches a selected data type
          // if (node.selectable && node.data?.dataType && this.currentSelectedDataTypes().includes(node.data.dataType)) {
          //   selected.push(node);

          //   // Mark all parents as containing selected nodes
          //   parents.forEach((parent) => containsSelectedNode.set(parent, true));
          // }
          if (node.selectable && node.data?.dataType && this.topicSelectionService.selected.includes(node.data.dataType)) {
            selected.push(node);

            // Mark all parents as containing selected nodes
            parents.forEach((parent) => containsSelectedNode.set(parent, true));
          }

          // Continue searching children
          if (node.children && node.children.length > 0) {
            findSelected(node.children as TreeNode<Node>[], [...parents, node]);
          }
        }
      };

      // Find selected nodes and track their parents
      findSelected(nodes);

      // Expand all parent nodes that contain selected children
      containsSelectedNode.forEach((hasSelectedChild, node) => {
        if (hasSelectedChild) {
          node.expanded = true;
        }
      });

      return selected;
    };

    this.selectedNodes = findSelectedNodes(this.treeNodes);
  }

  ngOnDestroy(): void {
    this.filterFormSubsription.unsubscribe();
  }

  // clearSelections = () => {
  //   this.treeNodes.forEach((node) => {
  //     node.expanded = false;
  //   });
  //   this.selectedDataTypesList = [];
  //   this.selectedDataTypes()([]);
  //   this.selectedNodes = undefined;
  // };
  clearSelections = () => {
    this.treeNodes.forEach((n) => (n.expanded = false));
    this.selectedDataTypesList = [];
    this.topicSelectionService.clear(); // publish
    this.selectedNodes = undefined;
  };

  transformDataTypeName(dataTypeName: string) {
    return dataTypeNamePipe(dataTypeName);
  }

  // nodeSelect(event: TreeNodeSelectEvent) {
  //   const { node } = event;
  //   // Only add if it's a leaf node (no children)
  //   const dataType = node.data?.dataType;
  //   if (dataType && !this.selectedDataTypesList.includes(dataType)) {
  //     this.selectedDataTypesList.push(dataType);
  //     this.selectedDataTypes()([...this.selectedDataTypesList]);
  //   }
  // }

  nodeSelect(event: TreeNodeSelectEvent) {
    const dt = event.node.data?.dataType;
    if (dt && !this.selectedDataTypesList.includes(dt)) {
      this.selectedDataTypesList.push(dt);
      this.topicSelectionService.add(dt); // publish
    }
  }

  // this is so awesome and made by chat
  onRowClick(evt: MouseEvent, node: TreeNode) {
    if (node.children?.length !== 0) {
      // parent row
      evt.preventDefault();
      evt.stopPropagation(); // keep selection engine out
      node.expanded = !node.expanded; // toggle expanded state
    }
    /* leaf rows fall through → normal multi‑selection behaviour */
  }

  // onNodeUnselect(event: TreeNodeUnSelectEvent) {
  //   const { node } = event;
  //   // Only remove if it's a leaf node (no children)
  //   if (!node.children || node.children.length === 0) {
  //     const dataType = node.data?.dataType;
  //     if (dataType) {
  //       this.selectedDataTypesList = this.selectedDataTypesList.filter((dt) => dt !== dataType);
  //       this.selectedDataTypes()([...this.selectedDataTypesList]);
  //     }
  //   }
  // }
  onNodeUnselect(event: TreeNodeUnSelectEvent) {
    const dt = event.node.data?.dataType;
    if (dt) {
      this.selectedDataTypesList = this.selectedDataTypesList.filter((x) => x !== dt);
      this.topicSelectionService.remove(dt); // publish
    }
  }
}
