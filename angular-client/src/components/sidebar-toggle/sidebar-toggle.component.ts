import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import SidebarService from 'src/services/sidebar.service';
import { Button } from 'primeng/button';

@Component({
  selector: 'sidebar-toggle',
  templateUrl: './sidebar-toggle.component.html',
  styleUrls: ['./sidebar-toggle.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [Button]
})
export default class SidebarToggleComponent {
  private sidebarService = inject(SidebarService);

  toggleSidebar() {
    this.sidebarService.openSidebar();
  }
}
