import { animate, style, transition, trigger } from '@angular/animations';
import { Component, Input } from '@angular/core';
import { DataType, Node, NodeWithVisibilityToggle } from 'src/utils/types.utils';

@Component({
  selector: 'graph-sidebar-mobile',
  templateUrl: './graph-sidebar-mobile.component.html',
  styleUrls: ['./graph-sidebar-mobile.component.css'],
  animations: [
    trigger('toggleCardExpand', [
      transition(':enter', [
        style({
          width: 0,
          opacity: 0
        }),
        animate(
          '400ms',
          style({
            width: '*',
            opacity: 1
          })
        )
      ]),
      transition(':leave', [
        animate(
          '400ms',
          style({
            width: 0,
            opacity: 0
          })
        )
      ])
    ]),
    trigger('toggleSidebar', [
      transition(':enter', [
        style({
          height: 0,
          opacity: 0
        }),
        animate(
          '400ms',
          style({
            height: '*',
            opacity: 1
          })
        )
      ]),
      transition(':leave', [
        animate(
          '400ms',
          style({
            height: 0,
            opacity: 0
          })
        )
      ])
    ])
  ]
})
export default class GraphSidebarMobile {
  @Input() nodes!: Node[];
  @Input() selectDataType!: (dataType: DataType) => void;
  nodesWithVisibilityToggle!: NodeWithVisibilityToggle[];
  showSelection = false;

  /**
   * Initializes the nodes with the visibility toggle.
   */
  ngOnInit(): void {
    this.nodesWithVisibilityToggle = this.nodes.map((node: Node) => {
      return {
        ...node,
        dataTypesAreVisible: false
      };
    });
  }

  /**
   * Toggles Visibility whenever a node is selected
   * @param node The node to toggle the visibility of the data types for.
   */
  toggleDataTypeVisibility = (node: NodeWithVisibilityToggle) => {
    node.dataTypesAreVisible = !node.dataTypesAreVisible;
  };

  /**
   * Toggles the sidebar.
   */
  toggleSidebar = () => {
    this.showSelection = !this.showSelection;
  };
}
