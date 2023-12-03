import { Component, HostListener, Input, OnInit } from '@angular/core';
import { DataType, Node } from 'src/utils/types.utils';

/**
 * Sidebar component wrapper that determines to display mobile or desktop sidebar.
 * @param nodes The nodes to display on the sidebar.
 * @param selectDataType The function to call when a data type is selected.
 */
@Component({
  selector: 'graph-sidebar',
  templateUrl: './graph-sidebar.component.html',
  styleUrls: ['./graph-sidebar.component.css']
})
export default class GraphSidebar implements OnInit {
  @Input() nodes!: Node[];
  @Input() selectDataType!: (dataType: DataType) => void;

  isMobile!: boolean;

  ngOnInit() {
    this.isMobile = window.innerWidth <= 768;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= 768;
  }
}
