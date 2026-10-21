import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CdkMenu, CdkMenuItem } from '@angular/cdk/menu';
import { MatIconModule } from '@angular/material/icon';
import { NavItem } from 'src/app/app-nav-bar/app-nav-bar.component';

/**
 * Grid of secondary nav destinations: a CDK menu opened by the nav bar's apps button
 * (cdkMenuTriggerFor). Arrow keys move between items, and Escape returns focus to the trigger.
 */
@Component({
  selector: 'app-nav-options-menu',
  imports: [MatIconModule, CdkMenu, CdkMenuItem],
  templateUrl: './nav-options-menu.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./nav-options-menu.component.css']
})
export class NavOptionsMenuComponent {
  items = input.required<NavItem[]>();
}
