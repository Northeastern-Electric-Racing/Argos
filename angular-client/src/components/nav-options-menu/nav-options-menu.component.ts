import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

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
  menuItems = input<NavItem[]>([]);
  /** Emits after an item's action runs, so the hosting popover can close. */
  itemSelected = output<NavItem>();

  select(item: NavItem) {
    item.onClick();
    this.itemSelected.emit(item);
  }
}
