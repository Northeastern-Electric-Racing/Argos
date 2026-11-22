import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { injectIsMobile } from 'src/ui/layout/mobile';
import { DataType } from 'src/utils/types.utils';
import GraphSidebarDesktopComponent from './graph-sidebar-desktop/graph-sidebar-desktop.component';
import GraphSidebarMobileComponent from './graph-sidebar-mobile/graph-sidebar-mobile.component';

/**
 * Sidebar component wrapper that determines to display mobile or desktop sidebar.
 * @param nodes The nodes to display on the sidebar.
 * @param selectDataType The function to call when a data type is selected.
 */
@Component({
  selector: 'graph-sidebar',
  templateUrl: './graph-sidebar.component.html',
  imports: [GraphSidebarDesktopComponent, GraphSidebarMobileComponent],
  changeDetection: ChangeDetectionStrategy.Eager
})
export default class GraphSidebarComponent {
  dataTypes = input.required<DataType[]>();

  isMobile = injectIsMobile();
}
