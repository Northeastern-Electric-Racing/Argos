import { Component, inject } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { NavItem } from 'src/utils/types.utils';

@Component({
  selector: 'app-nav-options-menu',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './nav-options-menu.component.html',
  styleUrls: ['./nav-options-menu.component.css']
})
export class NavOptionsMenuComponent {
  private config = inject(DynamicDialogConfig);
  menuItems: NavItem[] = this.config.data?.items || [];
}
