import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import SidebarService from 'src/services/sidebar.service';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'sidebar-toggle',
  templateUrl: './sidebar-toggle.component.html',
  styleUrls: ['./sidebar-toggle.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatIcon, MatIconButton]
})
export default class SidebarToggleComponent {
  private sidebarService = inject(SidebarService);

  toggleSidebar() {
    this.sidebarService.openSidebar();
  }
}
