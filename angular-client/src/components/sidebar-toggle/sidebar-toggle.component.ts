import { Component, inject } from '@angular/core';
import SidebarService from 'src/services/sidebar.service';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'sidebar-toggle',
    templateUrl: './sidebar-toggle.component.html',
    styleUrls: ['./sidebar-toggle.component.css'],
    standalone: true,
    imports: [MatIcon]
})
export default class SidebarToggleComponent {
  private sidebarService = inject(SidebarService);

  toggleSidebar() {
    this.sidebarService.openSidebar();
  }
}
