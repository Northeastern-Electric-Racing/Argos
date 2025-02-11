import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { DataType, Node, NodeWithVisibilityToggle } from 'src/utils/types.utils';
import { FormControl, FormGroup } from '@angular/forms';
import { debounceTime, Observable, of, Subscription } from 'rxjs';
import { dataTypesToNodes } from 'src/utils/dataTypes.utils';
import { dataTypeNamePipe } from 'src/utils/dataTypes.utils';

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
  @Input() dataTypes!: DataType[];
  @Input() selectDataType!: (dataType: DataType) => void;
  nodes!: Node[];
  nodesWithVisibilityToggle!: Observable<NodeWithVisibilityToggle[]>;

  filterForm: FormGroup = new FormGroup({
    searchFilter: new FormControl<string>('')
  });
  filterFormSubsription!: Subscription;
  searchFilter: string = '';

  /**
   * Initializes the nodes with the visibility toggle.
   */
  ngOnInit(): void {
    this.nodes = dataTypesToNodes(this.dataTypes);

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
  }

  ngOnDestroy(): void {
    this.filterFormSubsription.unsubscribe();
  }

  transformDataTypeName(dataTypeName: string) {
    return dataTypeNamePipe(dataTypeName);
  }
}
