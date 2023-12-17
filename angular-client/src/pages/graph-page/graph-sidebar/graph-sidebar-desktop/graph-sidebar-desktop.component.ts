import { animate, style, transition, trigger } from '@angular/animations';
import { Component, Input, OnInit } from '@angular/core';
import { DataType, Node, NodeWithVisibilityToggle } from 'src/utils/types.utils';

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
  animations: [
    trigger('toggleExpand', [
      transition(':enter', [
        style({
          height: 0,
          opacity: 0,
          transform: 'translateY(-25%)'
        }),
        animate(
          '400ms',
          style({
            height: '*',
            opacity: 1,
            transform: 'translateY(0)'
          })
        )
      ]),
      transition(':leave', [
        animate(
          '400ms',
          style({
            height: 0,
            opacity: 0,
            transform: 'translateY(-25%)'
          })
        )
      ])
    ])
  ]
})
export default class GraphSidebarDesktop implements OnInit {
  @Input() nodes!: Node[];
  nodesWithVisibilityToggle!: NodeWithVisibilityToggle[];
  @Input() selectDataType!: (dataType: DataType) => void;

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
  toggleDataTypeVisibility(node: NodeWithVisibilityToggle) {
    node.dataTypesAreVisible = !node.dataTypesAreVisible;
  }
}
