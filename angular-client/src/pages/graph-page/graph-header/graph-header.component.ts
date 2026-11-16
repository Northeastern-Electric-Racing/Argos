import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
import SidebarToggleComponent from 'src/components/sidebar-toggle/sidebar-toggle.component';
import { injectIsMobile } from 'src/ui/layout/mobile';

/**
 * Graph Header Component to display the graph page header.
 * Utilizes the header component to display the header.
 */
@Component({
  selector: 'graph-header',
  templateUrl: './graph-header.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [SidebarToggleComponent]
})
export default class GraphHeaderComponent implements OnInit {
  rightHeader = input.required<string>();
  isMobile = injectIsMobile();

  time = new Date();

  ngOnInit() {
    setInterval(() => {
      this.time = new Date();
    }, 1000);
  }
}
