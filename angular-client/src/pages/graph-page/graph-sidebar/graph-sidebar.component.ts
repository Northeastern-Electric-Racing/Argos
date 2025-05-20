import { Component, HostListener, Input, OnInit } from '@angular/core';
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
    styleUrls: ['./graph-sidebar.component.css'],
    standalone: true,
    imports: [GraphSidebarDesktopComponent, GraphSidebarMobileComponent]
})
export default class GraphSidebarComponent implements OnInit {
  @Input() dataTypes!: DataType[];
  @Input() selectDataTypes!: (dataTypes: DataType[]) => void;

  isMobile!: boolean;

  mobileThreshold = 768;

  ngOnInit() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
