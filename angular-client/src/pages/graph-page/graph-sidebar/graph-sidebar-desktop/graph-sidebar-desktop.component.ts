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
  private storage = inject(Storage);
  dataTypes = input<DataType[]>([]);
  selectedDataTypes = input.required<(dataTypes: DataType[]) => void>();
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
  }

  ngOnDestroy(): void {
    this.filterFormSubsription.unsubscribe();
  }

  clearSelections = () => {
    this.treeNodes.forEach((node) => {
      node.expanded = false;
    });
    this.selectedDataTypesList = [];
    this.selectedDataTypes()([]);
    this.selectedNodes = undefined;
  };

  transformDataTypeName(dataTypeName: string) {
    return dataTypeNamePipe(dataTypeName);
  }

  nodeSelect(event: TreeNodeSelectEvent) {
    const { node } = event;
    // Only add if it's a leaf node (no children)
    const dataType = node.data?.dataType;
    if (dataType && !this.selectedDataTypesList.includes(dataType)) {
      this.selectedDataTypesList.push(dataType);
      this.selectedDataTypes()([...this.selectedDataTypesList]);
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

  onNodeUnselect(event: TreeNodeUnSelectEvent) {
    const { node } = event;
    // Only remove if it's a leaf node (no children)
    if (!node.children || node.children.length === 0) {
      const dataType = node.data?.dataType;
      if (dataType) {
        this.selectedDataTypesList = this.selectedDataTypesList.filter((dt) => dt !== dataType);
        this.selectedDataTypes()([...this.selectedDataTypesList]);
      }
    }
  }
}
