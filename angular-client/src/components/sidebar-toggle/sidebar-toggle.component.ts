import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import SidebarService from 'src/services/sidebar.service';
import { MatIcon } from '@angular/material/icon';

/** The mobile menu button that opens the nav drawer; a real button, so focus can return to it. */
@Component({
  selector: 'sidebar-toggle',
  templateUrl: './sidebar-toggle.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatIcon]
})
export default class SidebarToggleComponent {
  private sidebarService = inject(SidebarService);

  toggleSidebar() {
    this.sidebarService.openSidebar();
  }
}
