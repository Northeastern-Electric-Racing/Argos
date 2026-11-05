import { Component, inject, input } from '@angular/core';
import { NodeWithVisibilityToggle } from 'src/utils/types.utils';

import { AsyncPipe } from '@angular/common';
import { NodeFilterPipe } from 'src/utils/pipes/node-filter.pipe';
import SidebarCardComponent from '../sidebar-card/sidebar-card.component';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { tw } from 'src/ui/recipes/tw';

/**
 * Node display component to display a card in the sidebar.
 */
@Component({
  selector: 'node-display',
  templateUrl: './node-display.component.html',
  imports: [AsyncPipe, NodeFilterPipe, SidebarCardComponent]
})
export default class NodeDisplayComponent {
  node = input.required<NodeWithVisibilityToggle>();
  isDesktop = input<boolean>(true);
  searchFilter = input<string>('');

  protected readonly row = tw('flex w-fit flex-row justify-start gap-4');
  protected readonly centred = tw('flex justify-center');
  protected readonly indented = tw('ml-7.5 block w-[95%]');

  private topicSelection = inject(TopicSelectionService);

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
      this.topicSelection.addDataType(node.dataType);
    }
  }
}
