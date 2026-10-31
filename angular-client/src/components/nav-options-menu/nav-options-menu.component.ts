import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TuiDataList } from '@taiga-ui/core';
import { NavItem } from 'src/app/app-nav-bar/app-nav-bar.component';

@Component({
  selector: 'app-nav-options-menu',
  imports: [MatIconModule, RouterLink, RouterLinkActive, TuiDataList],
  templateUrl: './nav-options-menu.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./nav-options-menu.component.css']
})
export class NavOptionsMenuComponent {
  items = input<NavItem[]>([]);
  itemClick = output<NavItem>();
}
