import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NavItem } from 'src/app/app-nav-bar/app-nav-bar.component';

/** Grid of secondary nav destinations, shown in a CDK overlay anchored to the nav bar's apps button. */
@Component({
  selector: 'app-nav-options-menu',
  imports: [MatIconModule],
  templateUrl: './nav-options-menu.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./nav-options-menu.component.css']
})
export class NavOptionsMenuComponent {
  items = input.required<NavItem[]>();
  /** Emits after an item runs, so the host can close the overlay. */
  itemSelected = output<NavItem>();

  select(item: NavItem) {
    item.onClick();
    this.itemSelected.emit(item);
  }
}
