import { animate, style, transition, trigger } from '@angular/animations';
import { Component, Input, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { dataTypeNamePipe, dataTypesToNodes } from 'src/utils/dataTypes.utils';
import { DataType, Node, NodeWithVisibilityToggle } from 'src/utils/types.utils';

import { AsyncPipe } from '@angular/common';
import NodeDisplayComponent from '../node-display/node-display.component';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'graph-sidebar-mobile',
  templateUrl: './graph-sidebar-mobile.component.html',
  styleUrls: ['./graph-sidebar-mobile.component.css'],
  animations: [
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
  ],
  standalone: true,
  imports: [AsyncPipe, NodeDisplayComponent, TypographyComponent]
})
export default class GraphSidebarMobileComponent implements OnInit {
  @Input() dataTypes!: DataType[];
  @Input() selectedDataTypes!: (dataTypes: DataType[]) => void;
  nodesWithVisibilityToggle!: Observable<NodeWithVisibilityToggle[]>;
  showSelection = false;
  nodes!: Node[];

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
  }

  /**
   * Toggles the sidebar.
   */
  toggleSidebar = () => {
    this.showSelection = !this.showSelection;
  };

  transformDataTypeName(dataTypeName: string) {
    return dataTypeNamePipe(dataTypeName);
  }
}
