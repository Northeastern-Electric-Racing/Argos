import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { NavItem } from 'src/app/app-nav-bar/app-nav-bar.component';

@Component({
  selector: 'app-nav-options-menu',
  imports: [MatIconModule],
  templateUrl: './nav-options-menu.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./nav-options-menu.component.css']
})
export class NavOptionsMenuComponent {
  private config = inject(DynamicDialogConfig);
  menuItems: NavItem[] = this.config.data?.items || [];
}
