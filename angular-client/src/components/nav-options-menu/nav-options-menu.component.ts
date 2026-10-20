import { DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { NavItem } from 'src/app/app-nav-bar/app-nav-bar.component';

@Component({
  selector: 'app-nav-options-menu',
  imports: [MatIconModule],
  templateUrl: './nav-options-menu.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./nav-options-menu.component.css']
})
export class NavOptionsMenuComponent {
  private dialogData = inject(DIALOG_DATA);
  menuItems: NavItem[] = this.dialogData?.items || [];
}
