import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DataType } from 'src/utils/types.utils';
import GraphSidebarDesktopComponent from './graph-sidebar-desktop/graph-sidebar-desktop.component';
import GraphSidebarMobileComponent from './graph-sidebar-mobile/graph-sidebar-mobile.component';

/**
 * Sidebar component wrapper that shows the mobile (drawer) or desktop sidebar.
 * @param dataTypes The data types to offer as topics.
 * @param isMobile Whether to show the mobile sidebar; the graph page owns the breakpoint.
 */
@Component({
  selector: 'graph-sidebar',
  templateUrl: './graph-sidebar.component.html',
  styleUrls: ['./graph-sidebar.component.css'],
  imports: [GraphSidebarDesktopComponent, GraphSidebarMobileComponent],
  changeDetection: ChangeDetectionStrategy.Eager
})
export default class GraphSidebarComponent {
  dataTypes = input.required<DataType[]>();
  isMobile = input.required<boolean>();
}
