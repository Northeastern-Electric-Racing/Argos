import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { NavItem } from 'src/app/app-nav-bar/app-nav-bar.component';

@Component({
  selector: 'app-nav-options-menu',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './nav-options-menu.component.html',
  styleUrls: ['./nav-options-menu.component.css']
})
export class NavOptionsMenuComponent {
  private config = inject(DynamicDialogConfig);
  menuItems: NavItem[] = this.config.data?.items || [];
}
