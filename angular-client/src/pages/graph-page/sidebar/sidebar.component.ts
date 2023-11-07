import { animate, style, transition, trigger } from '@angular/animations';
import { Component, Input, OnInit } from '@angular/core';
import { Node, NodeWithVisibilityToggle } from 'src/utils/types.utils';

@Component({
  selector: 'sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
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
export default class Sidebar implements OnInit {
  @Input() nodes!: Node[];
  nodesWithVisibilityToggle!: NodeWithVisibilityToggle[];

  ngOnInit(): void {
    this.nodesWithVisibilityToggle = this.nodes.map((node: Node) => {
      return {
        ...node,
        dataTypesAreVisible: false
      };
    });
  }

  toggleDataTypeVisibility(node: NodeWithVisibilityToggle) {
    node.dataTypesAreVisible = !node.dataTypesAreVisible;
  }
}
