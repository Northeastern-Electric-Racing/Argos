import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, Input } from '@angular/core';
import { DataType, NodeWithVisibilityToggle } from 'src/utils/types.utils';

/**
 * Node display component to display a card in the sidebar.
 */
@Component({
  selector: 'node-display',
  templateUrl: './node-display.component.html',
  styleUrls: ['./node-display.component.css'],
  animations: [
    trigger('toggleExpand', [
      state(
        'desktop-true',
        style({
          height: '*',
          opacity: 1,
          transform: 'translateY(0)'
        })
      ),
      state(
        'desktop-false',
        style({
          height: 0,
          opacity: 0,
          transform: 'translateY(-25%)'
        }),
        { params: { dropDown: true } }
      ),
      state(
        'mobile-true',
        style({
          opacity: 1,
          width: '*'
        })
      ),
      state(
        'mobile-false',
        style({
          opacity: 0,
          width: 0
        })
      ),
      transition('desktop-false => desktop-true', [
        style({
          height: 0,
          opacity: 0,
          transform: 'translateY(-25%)'
        }),
        animate('400ms')
      ]),
      transition('desktop-true => desktop-false', [animate('400ms')]),
      transition('mobile-true => mobile-false', [animate('400ms')]),
      transition('mobile-false => mobile-true', [animate('400ms')])
    ])
  ]
})
export default class NodeDisplayComponent {
  @Input() node!: NodeWithVisibilityToggle;
  @Input() isDesktop: boolean = true;
  @Input() searchFilter: string = '';
  @Input() selectDataType!: (dataType: DataType) => void;

  /**
   * Toggles Visibility whenever a node is selected
   * @param node The node to toggle the visibility of the data types for.
   */
  toggleSubnodeVisibility(node: NodeWithVisibilityToggle) {
    node.subnodesVisible = !node.subnodesVisible;
  }

  onSelect(node: NodeWithVisibilityToggle) {
    this.toggleSubnodeVisibility(node);
    if (node.nodes.value.length === 0) {
      this.selectDataType(node.dataType);
    }
  }
}
